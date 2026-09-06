import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import API from '@/api';
import {
  UserPlus, GraduationCap, Briefcase, Users, Mail, Phone,
  MapPin, Calendar, CreditCard, ShieldCheck, ArrowLeft, Loader2,
  FileText, Award, Sparkles, User, HeartHandshake, BookOpen, Building2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxFormField } from '@/widgets/comboboxFormField';
import logo from "@/assets/Times_Internation_School_logo.png";

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('student');
  const [loading, setLoading] = useState(false);

  // Data states
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gradesRes, classesRes, ayRes, rolesRes] = await Promise.all([
          API.get("/admin/get/open-grades"),
          API.get("/admin/get/open-classes"),
          API.get("/admin/get/open-academic-year"),
          API.get("getmenu/get/open-allroles")
        ]);
        setGrades(gradesRes.data.grades || []);
        setClasses(classesRes.data.classes || []);

        const fetchedAcademicYears = ayRes.data.academic_years || [];
        setAcademicYears(fetchedAcademicYears);

        const activeAy = fetchedAcademicYears.find(ay => ay.status === 'active') || fetchedAcademicYears[0];
        if (activeAy) {
          setStudentForm(prev => ({ ...prev, academic_year: activeAy.id.toString() }));
        }

        const filteredRoles = (rolesRes.data.roles || []).filter(
          role => role.sub_role === 'staff'
        );
        setRoles(filteredRoles);
      } catch (err) {
        console.error("Error fetching registration data:", err);
      }
    };
    fetchData();
  }, []);

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    name: '', email: '', password: '', phone: '', blood_group: '',
    gender: 'male', grade: '', class: '', admission_date: '',
    date_of_birth: '', academic_year: '', address: '',
    adhar_no: '', fathers_name: '', mothers_name: '',
    father_occupation: '', mother_contect: '', parent_contact: ''
  });

  // Teacher Form State
  const [teacherForm, setTeacherForm] = useState({
    name: '', email: '', password: '', phone: '', gender: 'female',
    hire_date: '', qualification: '', address: '', adhar_no: '', bio: ''
  });

  // Staff Form State
  const [staffForm, setStaffForm] = useState({
    name: '', email: '', password: '', sub_role: 'staff', phone: '',
    gender: 'male', department: '', hire_date: '',
    address: '', adhar_no: '', qualification: ''
  });

  const handleStudentChange = (e) => {
    setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  };

  const handleTeacherChange = (e) => {
    setTeacherForm({ ...teacherForm, [e.target.name]: e.target.value });
  };

  const handleStaffChange = (e) => {
    setStaffForm({ ...staffForm, [e.target.name]: e.target.value });
  };

  const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    let str = String(phone).trim().replace(/[\s-]/g, '');
    if (str.startsWith('+91')) {
      str = str.slice(3);
    } else if (str.startsWith('+')) {
      str = str.slice(1);
    } else if (str.length === 12 && str.startsWith('91')) {
      str = str.slice(2);
    }
    return str;
  };

  const isValid10DigitPhone = (phone) => /^[0-9]{10}$/.test(phone);

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    const cleanedPhone = cleanPhoneNumber(studentForm.phone);
    if (!studentForm.name || !studentForm.email || !cleanedPhone) {
      toast.error('Please fill in Name, Email, and Phone fields.');
      return;
    }
    if (!isValid10DigitPhone(cleanedPhone)) {
      toast.error('Phone number must be a valid 10-digit mobile number.');
      return;
    }
    if (studentForm.parent_contact && !isValid10DigitPhone(cleanPhoneNumber(studentForm.parent_contact))) {
      toast.error('Parent contact must be a valid 10-digit mobile number.');
      return;
    }
    if (studentForm.mother_contect && !isValid10DigitPhone(cleanPhoneNumber(studentForm.mother_contect))) {
      toast.error('Mother contact must be a valid 10-digit mobile number.');
      return;
    }

    if (!studentForm.grade) {
      toast.error('Target Grade is required.');
      return;
    }
    if (!studentForm.class) {
      toast.error('Target Class / Section is required.');
      return;
    }

    if (!studentForm.academic_year) {
      toast.error('Academic year is required.');
      return;
    }
    setLoading(true);
    try {
      const submissionStudentData = {
        ...studentForm,
        phone: cleanedPhone,
        mother_contect: cleanPhoneNumber(studentForm.mother_contect),
        parent_contact: cleanPhoneNumber(studentForm.parent_contact),
        password: cleanedPhone
      };
      const res = await API.post('/registration/student', submissionStudentData);
      toast.success(res.data?.message || 'Student application submitted successfully!');
      setStudentForm({
        name: '', email: '', password: '', phone: '', blood_group: '',
        gender: 'male', grade: '', class: '', admission_date: '',
        date_of_birth: '', academic_year: studentForm.academic_year, address: '',
        adhar_no: '', fathers_name: '', mothers_name: '',
        father_occupation: '', mother_contect: '', parent_contact: ''
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit student registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    const cleanedPhone = cleanPhoneNumber(teacherForm.phone);
    if (!teacherForm.name || !teacherForm.email || !cleanedPhone) {
      toast.error('Please fill in Name, Email, and Phone fields.');
      return;
    }
    if (!isValid10DigitPhone(cleanedPhone)) {
      toast.error('Phone number must be a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const submissionTeacherData = { ...teacherForm, phone: cleanedPhone, password: cleanedPhone };
      const res = await API.post('/registration/teacher', submissionTeacherData);
      toast.success(res.data?.message || 'Teacher application submitted successfully!');
      setTeacherForm({
        name: '', email: '', password: '', phone: '', gender: 'female',
        hire_date: '', qualification: '', address: '', adhar_no: '', bio: ''
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit teacher registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    const cleanedPhone = cleanPhoneNumber(staffForm.phone);
    if (!staffForm.name || !staffForm.email || !cleanedPhone) {
      toast.error('Please fill in Name, Email, and Phone fields.');
      return;
    }
    if (!isValid10DigitPhone(cleanedPhone)) {
      toast.error('Phone number must be a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const submissionStaffData = { ...staffForm, phone: cleanedPhone, password: cleanedPhone };
      const res = await API.post('/registration/staff', submissionStaffData);
      toast.success(res.data?.message || 'Staff application submitted successfully!');
      setStaffForm({
        name: '', email: '', password: '', sub_role: 'staff', phone: '',
        gender: 'male', department: '', hire_date: '',
        address: '', adhar_no: '', qualification: ''
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit staff registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-gray-900 dark:text-gray-100 py-3 sm:py-8 px-2 sm:px-6 lg:px-8 select-none">

      {/* Background Ambient Glow Spheres */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Top Navbar */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 flex items-center justify-between gap-2 bg-white/10 dark:bg-gray-900/60 backdrop-blur-xl p-2.5 sm:p-3.5 rounded-2xl border border-white/15 dark:border-gray-800 shadow-lg"
        >
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white hover:text-blue-300 bg-white/15 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all border border-white/15"
          >
            <ArrowLeft className="w-4 h-4" /> <span>Back to Sign In</span>
          </Link>

          <div className="flex items-center gap-2">
            <img src={logo} alt="Times International School" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full ring-2 ring-blue-400/50" />
            <div className="hidden sm:flex items-center gap-1.5 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Official Portal</span>
            </div>
          </div>
        </motion.div>

        {/* Hero Banner Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 p-4 sm:p-8 text-white shadow-2xl overflow-hidden mb-4 sm:mb-6 border border-white/20"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 rounded-full bg-purple-500/20 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] sm:text-xs font-bold uppercase tracking-widest text-blue-100 mb-2 border border-white/20">
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>Admissions & Onboarding</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Times International School Admission
              </h1>
              <p className="mt-1.5 text-blue-100 text-xs sm:text-sm font-medium max-w-xl leading-relaxed opacity-90">
                Submit your registration details below. Verified submissions are processed directly by school administration.
              </p>
            </div>
            <div className="hidden md:flex p-4 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 items-center justify-center shrink-0">
              <UserPlus className="w-12 h-12 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Tabbed Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800 p-3.5 sm:p-8"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {/* Custom Responsive Tab Triggers */}
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl sm:rounded-2xl mb-4 sm:mb-8 gap-1 h-auto">
              <TabsTrigger
                value="student"
                className="rounded-lg sm:rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md flex items-center justify-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="truncate">Student</span>
              </TabsTrigger>
              <TabsTrigger
                value="teacher"
                className="rounded-lg sm:rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md flex items-center justify-center gap-1.5"
              >
                <Briefcase className="w-4 h-4 shrink-0" />
                <span className="truncate">Teacher</span>
              </TabsTrigger>
              <TabsTrigger
                value="staff"
                className="rounded-lg sm:rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md flex items-center justify-center gap-1.5"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">Staff</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: STUDENT REGISTRATION */}
            <TabsContent value="student" className="space-y-4 focus:outline-none">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="text-blue-600 dark:text-blue-400 w-5 h-5" /> Student Admission Details
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Fields marked with an asterisk (<span className="text-red-500 font-bold">*</span>) are mandatory.
                </p>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-4">

                {/* Basic Personal Info Card */}
                <div className="bg-gray-50/60 dark:bg-gray-800/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/60 dark:border-gray-700/60 space-y-3">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5" /> Personal Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="name" value={studentForm.name} onChange={handleStudentChange}
                        placeholder="e.g. Rahul Sharma" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email" name="email" value={studentForm.email} onChange={handleStudentChange}
                        placeholder="student@example.com" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="phone"
                        value={studentForm.phone}
                        maxLength={10}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setStudentForm(prev => ({ ...prev, phone: val }));
                        }}
                        placeholder="10-digit mobile number" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Aadhaar Number
                      </label>
                      <Input
                        name="adhar_no" value={studentForm.adhar_no} onChange={handleStudentChange}
                        placeholder="12-digit UIDAI"
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Gender
                      </label>
                      <Select
                        value={studentForm.gender}
                        onValueChange={(val) => setStudentForm({ ...studentForm, gender: val })}
                      >
                        <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Blood Group
                      </label>
                      <Input
                        name="blood_group" value={studentForm.blood_group} onChange={handleStudentChange}
                        placeholder="e.g. B+"
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Placement Section */}
                <div className="bg-blue-50/50 dark:bg-gray-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-100 dark:border-gray-700/60 space-y-3">
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" /> Academic Placement
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <ComboboxFormField
                      label="Target Grade"
                      required
                      items={grades}
                      placeholder="Select Grade"
                      searchPlaceholder="Search grade..."
                      field={{
                        value: studentForm.grade,
                        onChange: (val) => setStudentForm({ ...studentForm, grade: val, class: '' })
                      }}
                      className="w-full text-xs sm:text-sm"
                    />

                    <ComboboxFormField
                      label="Target Class / Section"
                      required
                      items={classes.filter(c => !studentForm.grade || c.grade_id?.toString() === studentForm.grade?.toString())}
                      placeholder="Select Class"
                      searchPlaceholder="Search class..."
                      field={{
                        value: studentForm.class,
                        onChange: (val) => setStudentForm({ ...studentForm, class: val })
                      }}
                      className="w-full text-xs sm:text-sm"
                    />

                    <ComboboxFormField
                      label="Academic Year"
                      required
                      items={academicYears}
                      placeholder="Select Year"
                      searchPlaceholder="Search year..."
                      field={{
                        value: studentForm.academic_year,
                        onChange: (val) => setStudentForm({ ...studentForm, academic_year: val })
                      }}
                      className="w-full text-xs sm:text-sm"
                    />

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Date of Birth
                      </label>
                      <Input
                        type="date" name="date_of_birth" value={studentForm.date_of_birth} onChange={handleStudentChange}
                        className="rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Parents Info Card */}
                <div className="bg-gray-50/60 dark:bg-gray-800/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/60 dark:border-gray-700/60 space-y-3">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <HeartHandshake className="w-3.5 h-3.5" /> Parent / Guardian Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Father's Name
                      </label>
                      <Input
                        name="fathers_name" value={studentForm.fathers_name} onChange={handleStudentChange}
                        placeholder="Father's Full Name"
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Father / Parent Contact
                      </label>
                      <Input
                        name="parent_contact"
                        value={studentForm.parent_contact}
                        maxLength={10}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setStudentForm(prev => ({ ...prev, parent_contact: val }));
                        }}
                        placeholder="10-digit mobile number"
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Mother's Name
                      </label>
                      <Input
                        name="mothers_name" value={studentForm.mothers_name} onChange={handleStudentChange}
                        placeholder="Mother's Full Name"
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Mother Contact (Optional)
                      </label>
                      <Input
                        name="mother_contect" value={studentForm.mother_contect} onChange={handleStudentChange}
                        placeholder="Mother Mobile Number"
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Card */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Residential Address
                  </label>
                  <Textarea
                    name="address" value={studentForm.address} onChange={handleStudentChange}
                    placeholder="Street, Landmark, City, State, Pincode" rows={2}
                    className="rounded-xl border-gray-200 dark:border-gray-700 py-2 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  />
                </div>

                <Button
                  type="submit" disabled={loading}
                  className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Request...</> : 'Submit Student Request'}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 2: TEACHER REGISTRATION */}
            <TabsContent value="teacher" className="space-y-4 focus:outline-none">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="text-indigo-600 dark:text-indigo-400 w-5 h-5" /> Faculty / Teacher Application
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Share your credentials to onboard as an educator at Times International School.
                </p>
              </div>

              <form onSubmit={handleTeacherSubmit} className="space-y-4">

                {/* Personal Details */}
                <div className="bg-gray-50/60 dark:bg-gray-800/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/60 dark:border-gray-700/60 space-y-3">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5" /> Educator Info
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="name" value={teacherForm.name} onChange={handleTeacherChange}
                        placeholder="e.g. Dr. Ananya Sen" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email" name="email" value={teacherForm.email} onChange={handleTeacherChange}
                        placeholder="faculty@example.com" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="phone"
                        value={teacherForm.phone}
                        maxLength={10}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setTeacherForm(prev => ({ ...prev, phone: val }));
                        }}
                        placeholder="10-digit mobile number" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Aadhaar Number
                      </label>
                      <Input
                        name="adhar_no" value={teacherForm.adhar_no} onChange={handleTeacherChange}
                        placeholder="12-digit UIDAI"
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Gender
                      </label>
                      <Select
                        value={teacherForm.gender}
                        onValueChange={(val) => setTeacherForm({ ...teacherForm, gender: val })}
                      >
                        <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Date of Birth (Optional)
                      </label>
                      <Input
                        type="date" name="date_of_birth" value={teacherForm.date_of_birth} onChange={handleTeacherChange}
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                      />
                    </div> */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Availability / Start Date
                      </label>
                      <Input
                        type="date" name="hire_date" value={teacherForm.hire_date} onChange={handleTeacherChange}
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Qualifications */}
                <div className="bg-indigo-50/50 dark:bg-gray-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-indigo-100 dark:border-gray-700/60 space-y-3">
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5" /> Professional Qualifications
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Highest Qualification & Certifications
                    </label>
                    <Input
                      name="qualification" value={teacherForm.qualification} onChange={handleTeacherChange}
                      placeholder="e.g. M.Sc. in Physics, B.Ed., NET Qualified"
                      className="rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Professional Bio / Subject Specialization
                    </label>
                    <Textarea
                      name="bio" value={teacherForm.bio} onChange={handleTeacherChange}
                      placeholder="Overview of teaching methodology, years of experience, and subjects targeted." rows={2}
                      className="rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 py-2 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Correspondence Address
                  </label>
                  <Textarea
                    name="address" value={teacherForm.address} onChange={handleTeacherChange}
                    placeholder="House No, Suburb, City, Pincode" rows={2}
                    className="rounded-xl border-gray-200 dark:border-gray-700 py-2 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                  />
                </div>

                <Button
                  type="submit" disabled={loading}
                  className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Application...</> : 'Submit Teacher Application'}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 3: STAFF REGISTRATION */}
            <TabsContent value="staff" className="space-y-4 focus:outline-none">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="text-purple-600 dark:text-purple-400 w-5 h-5" /> Operational / Staff Registration
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Onboard administrative assistants, accountants, security personnel, drivers, and campus operational personnel.
                </p>
              </div>

              <form onSubmit={handleStaffSubmit} className="space-y-4">

                {/* Basic Info */}
                <div className="bg-gray-50/60 dark:bg-gray-800/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/60 dark:border-gray-700/60 space-y-3">
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5" /> Staff Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="name" value={staffForm.name} onChange={handleStaffChange}
                        placeholder="e.g. Ramesh Chandra" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email" name="email" value={staffForm.email} onChange={handleStaffChange}
                        placeholder="staff@example.com" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="phone"
                        value={staffForm.phone}
                        maxLength={10}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setStaffForm(prev => ({ ...prev, phone: val }));
                        }}
                        placeholder="10-digit mobile number" required
                        className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-purple-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub Role & Role Selection */}
                <div className="bg-purple-50/50 dark:bg-gray-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-100 dark:border-gray-700/60 space-y-3">
                  <div className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5" /> Department & Placement
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Assigned Sub Role
                      </label>
                      <Input
                        name="sub_role" value={staffForm.sub_role} disabled
                        className="rounded-xl bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 py-2 sm:py-2.5 text-xs sm:text-sm cursor-not-allowed"
                      />
                    </div>

                    <ComboboxFormField
                      label="Department / Role"
                      required
                      items={roles}
                      labelKey="role_name"
                      searchKey="role_name"
                      placeholder="Select Role"
                      searchPlaceholder="Search role..."
                      field={{
                        value: staffForm.department,
                        onChange: (val) => setStaffForm({ ...staffForm, department: val })
                      }}
                      className="w-full text-xs sm:text-sm"
                    />

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Available Date
                      </label>
                      <Input
                        type="date" name="hire_date" value={staffForm.hire_date} onChange={handleStaffChange}
                        className="rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-purple-500/20"
                      />
                    </div>

                    {/* <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Date of Birth (Optional)
                      </label>
                      <Input
                        type="date" name="date_of_birth" value={staffForm.date_of_birth} onChange={handleStaffChange}
                        className="rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-purple-500/20"
                      />
                    </div> */}
                  </div>
                </div>

                {/* Identity & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Aadhaar Number
                    </label>
                    <Input
                      name="adhar_no" value={staffForm.adhar_no} onChange={handleStaffChange}
                      placeholder="12-digit UIDAI"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 sm:py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Gender
                    </label>
                    <Select
                      value={staffForm.gender}
                      onValueChange={(val) => setStaffForm({ ...staffForm, gender: val })}
                    >
                      <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Highest Qualification & Certifications
                  </label>
                  <Textarea
                    name="qualification"
                    value={staffForm.qualification}
                    onChange={handleStaffChange}
                    placeholder="List your degrees, certifications, and relevant training" rows={2}
                    className="rounded-xl border-gray-200 dark:border-gray-700 py-2 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Contact Address
                  </label>
                  <Textarea
                    name="address" value={staffForm.address} onChange={handleStaffChange}
                    placeholder="Locality, Zone, City, Pincode" rows={2}
                    className="rounded-xl border-gray-200 dark:border-gray-700 py-2 text-xs sm:text-sm bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-purple-500/20"
                  />
                </div>

                <Button
                  type="submit" disabled={loading}
                  className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Record...</> : 'Submit Staff Registration'}
                </Button>
              </form>
            </TabsContent>

          </Tabs>
        </motion.div>

        {/* Global Footer Info */}
        <div className="mt-6 text-center text-[11px] sm:text-xs text-gray-400">
          © {new Date().getFullYear()} Times International School | Developed by <b className='text-gray-300'>MITHILESH INFODATASOFT CAREER RESEARCH ORGANISATION PVT LTD.</b>
        </div>
      </div>
    </div>
  );
}
