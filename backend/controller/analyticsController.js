const pool = require('../db');

/**
 * GET /api/analytics/dashboard
 * Aggregates statistics for the admin dashboard
 */
const getDashboardStats = async (req, res) => {
    try {
        const {
            financeFilter = 'monthly',
            academicYear,
            admissionGradeId,
            attendanceClassId
        } = req.query;

        // 1. Total Students (Active)
        const [studentCount] = await pool.execute('SELECT COUNT(*) as total FROM students WHERE status = "active"');

        // 2. Total Teachers
        const [teacherCount] = await pool.execute('SELECT COUNT(*) as total FROM teachers');

        // 3. Finance: Monthly Fee Collection for current year OR Yearly trend
        let financeData = [];
        if (financeFilter === 'yearly') {
            const [financeRows] = await pool.execute(`
                SELECT 
                    YEAR(payment_date) as year, 
                    SUM(paid_amount) as total_amount 
                FROM student_payments 
                GROUP BY YEAR(payment_date)
                ORDER BY year ASC
            `);
            financeData = financeRows.map(r => ({
                month: String(r.year),
                amount: Number(r.total_amount)
            }));
        } else {
            const currentYear = new Date().getFullYear();
            const [financeRows] = await pool.execute(`
                SELECT 
                    MONTH(payment_date) as month, 
                    SUM(paid_amount) as total_amount 
                FROM student_payments 
                WHERE YEAR(payment_date) = ? 
                GROUP BY MONTH(payment_date)
                ORDER BY month ASC
            `, [currentYear]);

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            financeData = monthNames.map((name, index) => {
                const monthNum = index + 1;
                const found = financeRows.find(r => r.month === monthNum);
                return {
                    month: name,
                    amount: found ? Number(found.total_amount) : 0
                };
            });
        }

        // 4. Attendance: Today's Summary (filtered by class if provided)
        const today = new Date().toISOString().slice(0, 10);
        let attendanceQuery = `
            SELECT status, COUNT(*) as count 
            FROM attendance 
            WHERE attendance_date = ?
        `;
        const attendanceParams = [today];
        if (attendanceClassId && attendanceClassId !== 'all') {
            attendanceQuery += ` AND class_id = ?`;
            attendanceParams.push(attendanceClassId);
        }
        attendanceQuery += ` GROUP BY status`;
        const [attendanceRows] = await pool.execute(attendanceQuery, attendanceParams);

        // 5. Gender-based Admission Counts (filtered by academic year and grade)

        let genderQuery = `
            SELECT 
                LOWER(u.gender) AS gender,
                COUNT(*) AS count
            FROM students s
            JOIN users u ON s.user_id = u.id
            JOIN student_academic_records sar ON s.id = sar.student_id
            WHERE 1=1
        `;

        const genderParams = [];

        if (academicYear) {
            genderQuery += ` AND sar.academic_year_id = ?`;
            genderParams.push(academicYear);
        }

        if (admissionGradeId) {
            genderQuery += ` AND sar.grade_id = ?`;
            genderParams.push(admissionGradeId);
        }

        genderQuery += ` GROUP BY LOWER(u.gender)`;

        // execute query
        const [genderRows] = await pool.execute(genderQuery, genderParams);

        // extract values
        const boysCount =
            genderRows.find(r => r.gender === "male")?.count || 0;

        const girlsCount =
            genderRows.find(r => r.gender === "female")?.count || 0;

        // 6. Students per class
        const [classStats] = await pool.execute(`
            SELECT c.name as className, COUNT(sar.student_id) as studentCount
            FROM classes c
            LEFT JOIN student_academic_records sar ON c.id = sar.class_id 
              AND sar.academic_year_id = (SELECT id FROM academic_years ORDER BY id DESC LIMIT 1)
            GROUP BY c.id
        `);

        // Get total fees for summary (current year)
        const [totalFeesRes] = await pool.execute(`
            SELECT SUM(paid_amount) as total 
            FROM student_payments 
            WHERE YEAR(payment_date) = YEAR(CURDATE())
        `);

        // --- TREND CALCULATIONS ---

        const calculateTrend = (current, previous) => {
            if (!previous || previous === 0) return (current > 0 ? `+${current.toFixed(2)}` : '0.0000') + '%';
            const diff = ((current - previous) / previous) * 100;
            return (diff >= 0 ? '+' : '') + diff.toFixed(2) + '%';
        };

        // 1. Student Trend (Month over Month)
        const [curMonthStudents] = await pool.execute('SELECT COUNT(*) as total FROM students WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())');
        const [prevMonthStudents] = await pool.execute('SELECT COUNT(*) as total FROM students WHERE MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH)');
        const studentTrend = calculateTrend(curMonthStudents[0].total, prevMonthStudents[0].total);

        // 2. Teacher Trend (Month over Month)
        const [curMonthTeachers] = await pool.execute('SELECT COUNT(*) as total FROM teachers WHERE id IN (SELECT id FROM users WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()))');
        const [prevMonthTeachers] = await pool.execute('SELECT COUNT(*) as total FROM teachers WHERE id IN (SELECT id FROM users WHERE MONTH(created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(CURDATE() - INTERVAL 1 MONTH))');
        const teacherTrend = calculateTrend(curMonthTeachers[0].total, prevMonthTeachers[0].total);

        // 3. Finance Trend (Month over Month)
        const [curMonthFees] = await pool.execute('SELECT SUM(paid_amount) as total FROM student_payments WHERE MONTH(payment_date) = MONTH(CURDATE()) AND YEAR(payment_date) = YEAR(CURDATE())');
        const [prevMonthFees] = await pool.execute('SELECT SUM(paid_amount) as total FROM student_payments WHERE MONTH(payment_date) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(payment_date) = YEAR(CURDATE() - INTERVAL 1 MONTH)');
        const feesTrend = calculateTrend(Number(curMonthFees[0].total || 0), Number(prevMonthFees[0].total || 0));

        // 4. Attendance Trend (Today vs Yesterday)
        let trendQueryToday = 'SELECT COUNT(*) as total, SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present FROM attendance WHERE attendance_date = CURDATE()';
        let trendQueryYesterday = 'SELECT COUNT(*) as total, SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present FROM attendance WHERE attendance_date = CURDATE() - INTERVAL 1 DAY';
        const trendParams = [];

        if (attendanceClassId && attendanceClassId !== 'all') {
            trendQueryToday += ' AND class_id = ?';
            trendQueryYesterday += ' AND class_id = ?';
            trendParams.push(attendanceClassId);
        }

        const [[todayAttendance]] = await pool.execute(trendQueryToday, trendParams);
        const [[yesterdayAttendance]] = await pool.execute(trendQueryYesterday, trendParams);

        const getPercent = (data) => (data.total > 0 ? (data.present / data.total) * 100 : 0);
        const todayPercent = getPercent(todayAttendance);
        const yesterdayPercent = getPercent(yesterdayAttendance);
        const attendanceTrend = calculateTrend(todayPercent, yesterdayPercent);

        return res.json({
            summary: {
                totalStudents: studentCount[0].total,
                totalTeachers: teacherCount[0].total,
                feesCollectedYear: totalFeesRes[0].total || 0,
                boysAdmission: boysCount,
                girlsAdmission: girlsCount,
                trends: {
                    students: studentTrend,
                    teachers: teacherTrend,
                    fees: feesTrend,
                    attendance: attendanceTrend
                }
            },
            financeData: financeData,
            attendanceData: attendanceRows.map(r => ({ name: r.status, value: r.count })),
            classData: classStats.map(r => ({ name: r.className, students: r.studentCount }))
        });
    } catch (err) {
        console.error('getDashboardStats error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/analytics/personal/attendance
 * Returns attendance statistics for the logged-in employee
 */
const getPersonalAttendanceStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // 1. Overall stats
        const [overallStats] = await pool.execute(`
            SELECT 
                status, 
                COUNT(*) as count 
            FROM employee_attendance 
            WHERE user_id = ?
            GROUP BY status
        `, [userId]);

        // 2. Current Month breakdown
        const [monthlyStats] = await pool.execute(`
            SELECT 
                status, 
                COUNT(*) as count 
            FROM employee_attendance 
            WHERE user_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
            GROUP BY status
        `, [userId, currentMonth, currentYear]);

        // 3. Recent history (Last 10 records)
        const [history] = await pool.execute(`
            SELECT 
                attendance_date as date, 
                status, 
                recorded_at
            FROM employee_attendance 
            WHERE user_id = ?
            ORDER BY attendance_date DESC
            LIMIT 10
        `, [userId]);

        // Calculate percentage (Present / Total recorded)
        const totalOverall = overallStats.reduce((sum, r) => sum + r.count, 0);
        const presentOverall = overallStats.find(r => r.status === 'present')?.count || 0;
        const attendancePercentage = totalOverall > 0 ? ((presentOverall / totalOverall) * 100).toFixed(1) : 0;

        return res.json({
            overall: {
                totalDays: totalOverall,
                presentDays: presentOverall,
                percentage: attendancePercentage,
                breakdown: overallStats.map(r => ({ status: r.status, count: r.count }))
            },
            monthly: {
                month: currentMonth,
                year: currentYear,
                breakdown: monthlyStats.map(r => ({ status: r.status, count: r.count }))
            },
            history: history
        });
    } catch (err) {
        console.error('getPersonalAttendanceStats error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/analytics/personal/attendance/history
 * Returns detailed attendance records for a date range
 */
const getPersonalAttendanceHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: 'From and To dates are required' });
        }

        const [records] = await pool.execute(`
            SELECT 
                ea.id,
                ea.attendance_date, 
                ea.status, 
                ea.recorded_at,
                u.name as recorded_by_name
            FROM employee_attendance ea
            LEFT JOIN users u ON ea.recorded_by = u.id
            WHERE ea.user_id = ? AND ea.attendance_date BETWEEN ? AND ?
            ORDER BY ea.attendance_date ASC
        `, [userId, from, to]);

        return res.json({ records });
    } catch (err) {
        console.error('getPersonalAttendanceHistory error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getDashboardStats,
    getPersonalAttendanceStats,
    getPersonalAttendanceHistory
};

