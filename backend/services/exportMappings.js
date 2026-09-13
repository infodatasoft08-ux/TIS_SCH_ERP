/**
 * Complete ERP Data Export Mappings for Times International School
 * Tailored specifically to times_international_school database schema
 */

const TABLE_MAPPINGS = [
  {
    key: 'school_info',
    sheetName: 'School Information',
    csvName: 'school_information',
    query: `
      SELECT 
        setting_key AS "Setting Key",
        setting_value AS "Setting Value"
      FROM school_settings
      ORDER BY setting_key ASC
    `
  },
  {
    key: 'academic_years',
    sheetName: 'Academic Sessions',
    csvName: 'academic_sessions',
    query: `
      SELECT 
        id AS "Session ID",
        name AS "Academic Session Name",
        UPPER(status) AS "Status",
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS "Created Date"
      FROM academic_years
      ORDER BY id DESC
    `
  },
  {
    key: 'classes_and_grades',
    sheetName: 'Classes & Grades',
    csvName: 'classes_and_grades',
    query: `
      SELECT 
        c.id AS "Class ID",
        c.name AS "Class Name",
        g.name AS "Grade Level Name",
        g.description AS "Grade Description",
        DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS "Created Date"
      FROM classes c
      LEFT JOIN grades g ON c.grade_id = g.id
      ORDER BY c.id ASC
    `
  },
  {
    key: 'subjects',
    sheetName: 'Subjects',
    csvName: 'subjects',
    query: `
      SELECT 
        id AS "Subject ID",
        code AS "Subject Code",
        name AS "Subject Name",
        subject_type AS "Subject Category",
        description AS "Description",
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS "Created Date"
      FROM subjects
      ORDER BY id ASC
    `
  },
  {
    key: 'students',
    sheetName: 'Students Master Directory',
    csvName: 'students_master_directory',
    query: `
      SELECT 
        s.id AS "System Student ID",
        s.admission_no AS "Admission Number",
        u.name AS "Student Full Name",
        u.email AS "Email Address",
        u.phone AS "Phone Number",
        s.date_of_birth AS "Date of Birth",
        s.fathers_name AS "Father Name",
        s.mothers_name AS "Mother Name",
        s.parent_contact AS "Parent Contact",
        s.mother_contect AS "Mother Contact",
        s.father_occupation AS "Father Occupation",
        UPPER(s.blood_group) AS "Blood Group",
        s.admission_date AS "Admission Date",
        UPPER(s.status) AS "Account Status",
        DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i') AS "Registration Date"
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC
    `
  },
  {
    key: 'parents',
    sheetName: 'Parents & Guardians',
    csvName: 'parents_and_guardians',
    query: `
      SELECT 
        p.id AS "Parent ID",
        u.name AS "Parent Name",
        u.email AS "Email Address",
        u.phone AS "Primary Phone",
        p.relation AS "Relation",
        p.occupation AS "Occupation"
      FROM parents p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.id DESC
    `
  },
  {
    key: 'parent_children_mapping',
    sheetName: 'Parent Child Linkages',
    csvName: 'parent_child_linkages',
    query: `
      SELECT 
        pu.name AS "Parent Name",
        pu.phone AS "Parent Phone",
        s.admission_no AS "Student Admission No",
        su.name AS "Student Name",
        UPPER(pc.relationship) AS "Relationship"
      FROM parent_children pc
      JOIN parents p ON pc.parent_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN students s ON pc.student_id = s.id
      JOIN users su ON s.user_id = su.id
    `
  },
  {
    key: 'teachers',
    sheetName: 'Teachers',
    csvName: 'teachers',
    query: `
      SELECT 
        t.id AS "Teacher ID",
        t.employee_code AS "Employee Code",
        u.name AS "Teacher Name",
        u.email AS "Email Address",
        u.phone AS "Phone Number",
        t.qualification AS "Qualifications",
        t.bio AS "Bio",
        t.hire_date AS "Hire Date"
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.id DESC
    `
  },
  {
    key: 'staff',
    sheetName: 'Staff Members',
    csvName: 'staff_members',
    query: `
      SELECT 
        st.id AS "Staff ID",
        st.employee_code AS "Employee Code",
        u.name AS "Staff Name",
        u.email AS "Email Address",
        u.phone AS "Phone Number",
        st.department AS "Department",
        st.qualification AS "Qualifications",
        st.hire_date AS "Hire Date"
      FROM staff st
      JOIN users u ON st.user_id = u.id
      ORDER BY st.id DESC
    `
  },
  {
    key: 'teacher_subjects',
    sheetName: 'Teacher Subject Assignments',
    csvName: 'teacher_subject_assignments',
    query: `
      SELECT 
        ts.teacher_id AS "Teacher ID",
        u.name AS "Teacher Name",
        sub.name AS "Assigned Subject",
        sub.code AS "Subject Code"
      FROM teacher_subjects ts
      JOIN teachers t ON ts.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      JOIN subjects sub ON ts.subject_id = sub.id
      ORDER BY ts.teacher_id ASC
    `
  },
  {
    key: 'student_attendance',
    sheetName: 'Student Attendance Log',
    csvName: 'student_attendance_log',
    query: `
      SELECT 
        att.id AS "Attendance Record ID",
        att.attendance_date AS "Attendance Date",
        s.admission_no AS "Student Admission No",
        su.name AS "Student Name",
        c.name AS "Class Name",
        UPPER(att.status) AS "Attendance Status",
        ru.name AS "Recorded By User",
        DATE_FORMAT(att.recorded_at, '%Y-%m-%d %H:%i') AS "Recorded Date"
      FROM attendance att
      JOIN students s ON att.student_id = s.id
      JOIN users su ON s.user_id = su.id
      LEFT JOIN classes c ON att.class_id = c.id
      LEFT JOIN users ru ON att.recorded_by = ru.id
      ORDER BY att.id DESC
    `
  },
  {
    key: 'employee_attendance',
    sheetName: 'Staff Attendance Log',
    csvName: 'staff_attendance_log',
    query: `
      SELECT 
        ea.id AS "Record ID",
        ea.attendance_date AS "Attendance Date",
        u.name AS "Employee Name",
        u.email AS "Employee Email",
        UPPER(ea.status) AS "Status",
        DATE_FORMAT(ea.recorded_at, '%Y-%m-%d %H:%i') AS "Recorded Date"
      FROM employee_attendance ea
      JOIN users u ON ea.user_id = u.id
      ORDER BY ea.id DESC
    `
  },
  {
    key: 'fee_types',
    sheetName: 'Fee Types',
    csvName: 'fee_types',
    query: `
      SELECT 
        id AS "Fee Type ID",
        name AS "Fee Category Name",
        description AS "Description",
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS "Created Date"
      FROM fee_types
      ORDER BY id ASC
    `
  },
  {
    key: 'class_fee_structure',
    sheetName: 'Fee Structure Master',
    csvName: 'fee_structure_master',
    query: `
      SELECT 
        cfs.id AS "Structure ID",
        g.name AS "Grade Level",
        ay.name AS "Academic Session",
        ft.name AS "Fee Category",
        cfs.monthly_amount AS "Monthly Amount (INR)",
        DATE_FORMAT(cfs.created_at, '%Y-%m-%d %H:%i') AS "Created Date"
      FROM class_fee_structure cfs
      LEFT JOIN grades g ON cfs.grade_id = g.id
      LEFT JOIN academic_years ay ON cfs.academic_year_id = ay.id
      LEFT JOIN fee_types ft ON cfs.fee_type_id = ft.id
      ORDER BY cfs.id DESC
    `
  },
  {
    key: 'student_invoices',
    sheetName: 'Student Fee Invoices',
    csvName: 'student_fee_invoices',
    query: `
      SELECT 
        si.id AS "Invoice ID",
        s.admission_no AS "Admission Number",
        su.name AS "Student Name",
        c.name AS "Class Name",
        si.period_start AS "Period Start",
        si.period_end AS "Period End",
        si.due_date AS "Due Date",
        si.amount_due AS "Amount Due (INR)",
        si.fine_amount AS "Fine Amount (INR)",
        si.discount_amount AS "Discount Amount (INR)",
        si.amount_paid AS "Amount Paid (INR)",
        (si.amount_due + si.fine_amount - si.discount_amount - si.amount_paid) AS "Remaining Balance Due (INR)",
        UPPER(si.status) AS "Payment Status",
        DATE_FORMAT(si.created_at, '%Y-%m-%d %H:%i') AS "Created Date"
      FROM student_invoices si
      JOIN students s ON si.student_id = s.id
      JOIN users su ON s.user_id = su.id
      LEFT JOIN classes c ON si.class_id = c.id
      ORDER BY si.id DESC
    `
  },
  {
    key: 'invoice_lines',
    sheetName: 'Invoice Item Breakdown',
    csvName: 'invoice_item_breakdown',
    query: `
      SELECT 
        il.id AS "Line Item ID",
        il.invoice_id AS "Invoice ID",
        ft.name AS "Fee Component Name",
        il.amount AS "Component Amount (INR)"
      FROM invoice_lines il
      LEFT JOIN fee_types ft ON il.fee_type_id = ft.id
      ORDER BY il.id DESC
    `
  },
  {
    key: 'invoice_fines',
    sheetName: 'Invoice Fines Detail',
    csvName: 'invoice_fines_detail',
    query: `
      SELECT 
        ifn.id AS "Fine Record ID",
        ifn.invoice_id AS "Invoice ID",
        ifn.fine_type AS "Fine Type",
        ifn.description AS "Fine Description / Reason",
        ifn.amount AS "Fine Amount (INR)",
        IF(ifn.is_reversed = 1, 'YES', 'NO') AS "Is Reversed",
        ifn.reversed_reason AS "Reversed Reason",
        DATE_FORMAT(ifn.created_at, '%Y-%m-%d %H:%i') AS "Applied Date"
      FROM invoice_fines ifn
      ORDER BY ifn.id DESC
    `
  },
  {
    key: 'invoice_discounts',
    sheetName: 'Invoice Discounts Detail',
    csvName: 'invoice_discounts_detail',
    query: `
      SELECT 
        idisc.id AS "Discount Record ID",
        idisc.invoice_id AS "Invoice ID",
        idisc.reason AS "Discount Reason",
        idisc.amount AS "Discount Amount (INR)",
        DATE_FORMAT(idisc.created_at, '%Y-%m-%d %H:%i') AS "Applied Date"
      FROM invoice_discounts idisc
      ORDER BY idisc.id DESC
    `
  },
  {
    key: 'student_payments',
    sheetName: 'Fee Payments',
    csvName: 'fee_payments',
    query: `
      SELECT 
        sp.id AS "Payment Record ID",
        sp.invoice_id AS "Invoice ID",
        s.admission_no AS "Admission Number",
        su.name AS "Student Name",
        sp.paid_amount AS "Amount Paid (INR)",
        UPPER(sp.payment_method) AS "Payment Method",
        sp.reference AS "Transaction Reference",
        sp.payment_date AS "Payment Date",
        ru.name AS "Collected By User"
      FROM student_payments sp
      JOIN student_invoices si ON sp.invoice_id = si.id
      JOIN students s ON si.student_id = s.id
      JOIN users su ON s.user_id = su.id
      LEFT JOIN users ru ON sp.processed_by = ru.id
      ORDER BY sp.id DESC
    `
  },
  {
    key: 'exam_groups',
    sheetName: 'Exam Groups & Terms',
    csvName: 'exam_groups_and_terms',
    query: `
      SELECT 
        eg.id AS "Exam Group ID",
        eg.name AS "Exam Group / Term Name",
        c.name AS "Class Name",
        g.name AS "Grade Name",
        ay.name AS "Academic Session",
        eg.exam_type AS "Exam Type",
        eg.custom_exam_name AS "Custom Exam Title",
        DATE_FORMAT(eg.start_date, '%Y-%m-%d') AS "Start Date",
        DATE_FORMAT(eg.end_date, '%Y-%m-%d') AS "End Date",
        DATE_FORMAT(eg.ptm_date, '%Y-%m-%d') AS "PTM Date",
        eg.total_working_days AS "Total Working Days",
        eg.status AS "Status",
        IF(eg.is_results_published = 1, 'YES', 'NO') AS "Is Results Published",
        eg.note AS "Notes / Instructions",
        DATE_FORMAT(eg.created_at, '%Y-%m-%d %H:%i') AS "Created At"
      FROM exam_groups eg
      LEFT JOIN classes c ON eg.class_id = c.id
      LEFT JOIN grades g ON eg.grade_id = g.id
      LEFT JOIN academic_years ay ON eg.academic_year_id = ay.id
      ORDER BY eg.id DESC
    `
  },
  {
    key: 'exam_group_subjects',
    sheetName: 'Exam Sub-Subject Max Marks',
    csvName: 'exam_sub_subject_max_marks',
    query: `
      SELECT 
        egs.id AS "Exam Subject ID",
        eg.name AS "Exam Group / Term Name",
        c.name AS "Class Name",
        sub.name AS "Subject Name",
        sub.code AS "Subject Code",
        egs.exam_category AS "Exam Category",
        DATE_FORMAT(egs.exam_date, '%Y-%m-%d') AS "Exam Date",
        egs.start_time AS "Start Time",
        egs.end_time AS "End Time",
        egs.max_marks AS "Total Max Marks",
        egs.passing_marks AS "Passing Marks",
        IF(egs.has_theory = 1, 'YES', 'NO') AS "Has Theory",
        egs.theory_max_marks AS "Theory Max Marks",
        IF(egs.has_lab = 1, 'YES', 'NO') AS "Has Lab",
        egs.lab_max_marks AS "Lab Max Marks",
        IF(egs.has_oral = 1, 'YES', 'NO') AS "Has Oral",
        egs.oral_max_marks AS "Oral Max Marks",
        IF(egs.has_written = 1, 'YES', 'NO') AS "Has Written",
        egs.written_max_marks AS "Written Max Marks",
        IF(egs.has_reading = 1, 'YES', 'NO') AS "Has Reading",
        egs.reading_max_marks AS "Reading Max Marks",
        IF(egs.has_writing_comp = 1, 'YES', 'NO') AS "Has Writing Comp",
        egs.writing_comp_max_marks AS "Writing Comp Max Marks",
        IF(egs.has_dictation = 1, 'YES', 'NO') AS "Has Dictation",
        egs.dictation_max_marks AS "Dictation Max Marks",
        IF(egs.has_recitation = 1, 'YES', 'NO') AS "Has Recitation",
        egs.recitation_max_marks AS "Recitation Max Marks",
        IF(egs.has_ia_pr = 1, 'YES', 'NO') AS "Has IA/PR",
        egs.ia_pr_max_marks AS "IA/PR Max Marks",
        egs.sitting AS "Sitting / Shift"
      FROM exam_group_subjects egs
      JOIN exam_groups eg ON egs.exam_group_id = eg.id
      LEFT JOIN classes c ON eg.class_id = c.id
      LEFT JOIN subjects sub ON egs.subject_id = sub.id
      ORDER BY egs.id DESC
    `
  },
  {
    key: 'exam_group_results',
    sheetName: 'Exam SubSubject Results',
    csvName: 'exam_sub_subject_detailed_results',
    query: `
      SELECT 
        egr.id AS "Result ID",
        eg.name AS "Exam Group / Term Name",
        c.name AS "Class Name",
        sub.name AS "Subject Name",
        s.admission_no AS "Admission Number",
        su.name AS "Student Name",
        egr.attendance_status AS "Attendance Status",
        egr.marks_obtained AS "Total Marks Obtained",
        egs.max_marks AS "Total Max Marks",
        egr.grade AS "Grade Awarded",
        egr.theory_marks_obtained AS "Theory Marks Obtained",
        egs.theory_max_marks AS "Theory Max Marks",
        egr.lab_marks_obtained AS "Lab Marks Obtained",
        egs.lab_max_marks AS "Lab Max Marks",
        egr.oral_marks_obtained AS "Oral Marks Obtained",
        egs.oral_max_marks AS "Oral Max Marks",
        egr.written_marks_obtained AS "Written Marks Obtained",
        egs.written_max_marks AS "Written Max Marks",
        egr.reading_marks_obtained AS "Reading Marks Obtained",
        egs.reading_max_marks AS "Reading Max Marks",
        egr.writing_comp_marks_obtained AS "Writing Comp Marks Obtained",
        egs.writing_comp_max_marks AS "Writing Comp Max Marks",
        egr.dictation_marks_obtained AS "Dictation Marks Obtained",
        egs.dictation_max_marks AS "Dictation Max Marks",
        egr.recitation_marks_obtained AS "Recitation Marks Obtained",
        egs.recitation_max_marks AS "Recitation Max Marks",
        egr.ia_pr_marks_obtained AS "IA/PR Marks Obtained",
        egs.ia_pr_max_marks AS "IA/PR Max Marks",
        egr.teacher_remark AS "Teacher Remarks",
        egr.principal_remark AS "Principal Remarks",
        egr.next_class AS "Promoted Next Class",
        DATE_FORMAT(egr.recorded_at, '%Y-%m-%d %H:%i') AS "Recorded At"
      FROM exam_group_results egr
      JOIN exam_group_subjects egs ON egr.exam_group_subject_id = egs.id
      JOIN exam_groups eg ON egs.exam_group_id = eg.id
      JOIN students s ON egr.student_id = s.id
      JOIN users su ON s.user_id = su.id
      LEFT JOIN classes c ON eg.class_id = c.id
      LEFT JOIN subjects sub ON egs.subject_id = sub.id
      ORDER BY egr.id DESC
    `
  },
  {
    key: 'exam_components',
    sheetName: 'Exam Dynamic Components',
    csvName: 'exam_dynamic_components',
    query: `
      SELECT 
        id AS "Component ID",
        name AS "Component Name",
        slug AS "Slug Handle",
        description AS "Description",
        sort_order AS "Sort Order",
        IF(is_active = 1, 'ACTIVE', 'INACTIVE') AS "Status"
      FROM exam_components
      ORDER BY sort_order ASC, id ASC
    `
  },
  {
    key: 'exams',
    sheetName: 'Single Subject Exams',
    csvName: 'single_subject_exams',
    query: `
      SELECT 
        ex.id AS "Exam ID",
        ex.name AS "Exam Name",
        c.name AS "Class Name",
        g.name AS "Grade Name",
        sub.name AS "Subject Name",
        DATE_FORMAT(ex.exam_date, '%Y-%m-%d') AS "Exam Date",
        ex.max_marks AS "Total / Max Marks",
        ex.weightage AS "Weightage",
        ex.instructions AS "Instructions",
        ex.academic_year AS "Academic Session",
        DATE_FORMAT(ex.created_at, '%Y-%m-%d %H:%i') AS "Created At"
      FROM exams ex
      LEFT JOIN classes c ON ex.class_id = c.id
      LEFT JOIN grades g ON ex.grade_id = g.id
      LEFT JOIN subjects sub ON ex.subject_id = sub.id
      ORDER BY ex.id DESC
    `
  },
  {
    key: 'exam_results',
    sheetName: 'Single Subject Exam Results',
    csvName: 'single_subject_exam_results',
    query: `
      SELECT 
        er.id AS "Result ID",
        ex.name AS "Exam Name",
        s.admission_no AS "Admission Number",
        su.name AS "Student Name",
        c.name AS "Class Name",
        sub.name AS "Subject Name",
        er.marks_obtained AS "Marks Obtained",
        ex.max_marks AS "Max Marks",
        er.grade AS "Grade Awarded",
        er.remarks AS "Teacher Remarks",
        DATE_FORMAT(er.recorded_at, '%Y-%m-%d %H:%i') AS "Recorded At"
      FROM exam_results er
      JOIN exams ex ON er.exam_id = ex.id
      JOIN students s ON er.student_id = s.id
      JOIN users su ON s.user_id = su.id
      LEFT JOIN classes c ON ex.class_id = c.id
      LEFT JOIN subjects sub ON ex.subject_id = sub.id
      ORDER BY er.id DESC
    `
  },
  {
    key: 'class_routines',
    sheetName: 'Class Timetable Routines',
    csvName: 'class_timetable_routines',
    query: `
      SELECT 
        cr.id AS "Routine ID",
        c.name AS "Class Name",
        sub.name AS "Subject Name",
        tu.name AS "Teacher Name",
        UPPER(cr.day_of_week) AS "Day of Week",
        cr.start_time AS "Start Time",
        cr.end_time AS "End Time",
        cr.room AS "Room Number"
      FROM class_routines cr
      LEFT JOIN classes c ON cr.class_id = c.id
      LEFT JOIN subjects sub ON cr.subject_id = sub.id
      LEFT JOIN teachers t ON cr.teacher_id = t.id
      LEFT JOIN users tu ON t.user_id = tu.id
      ORDER BY cr.id ASC
    `
  },
  {
    key: 'homeworks',
    sheetName: 'Homework Assignments',
    csvName: 'homework_assignments',
    query: `
      SELECT 
        h.id AS "Homework ID",
        h.title AS "Homework Title",
        c.name AS "Class Name",
        g.name AS "Grade Name",
        h.homework_date AS "Homework Date",
        DATE_FORMAT(h.created_at, '%Y-%m-%d %H:%i') AS "Created At"
      FROM homeworks h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN grades g ON h.grade_id = g.id
      ORDER BY h.id DESC
    `
  },
  {
    key: 'assignments',
    sheetName: 'Assignments',
    csvName: 'assignments',
    query: `
      SELECT 
        a.id AS "Assignment ID",
        a.title AS "Assignment Title",
        a.description AS "Description",
        c.name AS "Class Name",
        sub.name AS "Subject Name",
        a.assigned_date AS "Assigned Date",
        a.due_date AS "Due Date",
        a.max_marks AS "Total / Max Marks",
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS "Created Date"
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      ORDER BY a.id DESC
    `
  },
  {
    key: 'notes',
    sheetName: 'Study Notes & Materials',
    csvName: 'study_notes_and_materials',
    query: `
      SELECT 
        n.id AS "Note ID",
        n.note_name AS "Note Name",
        n.description AS "Description",
        c.name AS "Class Name",
        sub.name AS "Subject Name",
        u.name AS "Uploaded By Teacher",
        n.uploaded_date AS "Uploaded Date"
      FROM notes n
      LEFT JOIN classes c ON n.class_id = c.id
      LEFT JOIN subjects sub ON n.subject_id = sub.id
      LEFT JOIN teachers t ON n.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY n.id DESC
    `
  },
  {
    key: 'notices',
    sheetName: 'School Notices',
    csvName: 'school_notices',
    query: `
      SELECT 
        id AS "Notice ID",
        title AS "Notice Title",
        body AS "Notice Body",
        audience AS "Target Audience",
        IF(is_published = 1, 'YES', 'NO') AS "Is Published",
        publish_at AS "Publish Date",
        expire_at AS "Expiration Date",
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS "Created Date"
      FROM notices
      ORDER BY id DESC
    `
  },
  {
    key: 'events',
    sheetName: 'School Events',
    csvName: 'school_events',
    query: `
      SELECT 
        id AS "Event ID",
        title AS "Event Title",
        description AS "Description",
        location AS "Venue / Location",
        event_date AS "Event Date",
        start_time AS "Start Time",
        end_time AS "End Time",
        capacity AS "Capacity",
        IF(is_public = 1, 'YES', 'NO') AS "Is Public",
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS "Created At"
      FROM events
      ORDER BY id DESC
    `
  },
  {
    key: 'generated_documents',
    sheetName: 'Issued Documents & ID Cards',
    csvName: 'issued_documents_and_id_cards',
    query: `
      SELECT 
        gd.id AS "Document ID",
        dt.name AS "Template Name",
        dt.type AS "Document Type",
        u.name AS "Generated By User",
        DATE_FORMAT(gd.created_at, '%Y-%m-%d %H:%i') AS "Generated At"
      FROM generated_documents gd
      LEFT JOIN document_templates dt ON gd.template_id = dt.id
      LEFT JOIN users u ON gd.generated_by = u.id
      ORDER BY gd.id DESC
    `
  }
];

module.exports = TABLE_MAPPINGS;
