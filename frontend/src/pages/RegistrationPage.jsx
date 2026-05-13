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
  UserPlus, GraduationCap, Briefcase, Users, Mail, Lock, Phone,
  MapPin, Calendar, CreditCard, ShieldCheck, ArrowLeft, Loader2,
  FileText, Award, Check, ChevronsUpDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ComboboxFormField } from '@/widgets/comboboxFormField';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('student');
  const [loading, setLoading] = useState(false);

  // Data states
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [roles, setRoles] = useState([]);

  // Popover open states (no longer needed as ComboboxFormField manages its own)


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
        setAcademicYears(ayRes.data.academic_years || []);

        // Filter roles where sub_role is 'staff'
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
    date_of_birth: '', academic_year: '2025-2026', address: '',
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
    address: '', adhar_no: ''
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

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.email || !studentForm.password) {
      toast.error('Please fill in Name, Email, and Password fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/registration/student', studentForm);
      toast.success(res.data?.message || 'Student application submitted successfully!');
      setStudentForm({
        name: '', email: '', password: '', phone: '', blood_group: '',
        gender: 'male', grade: '', class: '', admission_date: '',
        date_of_birth: '', academic_year: '2025-2026', address: '',
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
    if (!teacherForm.name || !teacherForm.email || !teacherForm.password) {
      toast.error('Please fill in Name, Email, and Password fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/registration/teacher', teacherForm);
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
    if (!staffForm.name || !staffForm.email || !staffForm.password) {
      toast.error('Please fill in Name, Email, and Password fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/registration/staff', staffForm);
      toast.success(res.data?.message || 'Staff application submitted successfully!');
      setStaffForm({
        name: '', email: '', password: '', sub_role: 'staff', phone: '',
        gender: 'male', department: '', hire_date: '',
        address: '', adhar_no: ''
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit staff registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">

        {/* Navigation Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-indigo-100 dark:border-gray-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
          <div className="flex items-center gap-2 bg-indigo-600/10 dark:bg-indigo-400/10 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 tracking-wide uppercase">Official Portal</span>
          </div>
        </motion.div>

        {/* Hero Banner Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-xl bg-blue-600 p-6 sm:p-9 text-white shadow-xl overflow-hidden mb-10"
        >
          {/* Glassmorphism background geometric accents */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-black/10 blur-xl"></div>

          <div className="relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-3">
                Admissions & Onboarding
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Join Our Academic Community
              </h1>
              <p className="mt-3 text-blue-100 max-w-xl text-sm sm:text-base font-medium leading-relaxed">
                Submit your public application form below. Verified submissions are reviewed instantly by administration for primary database mapping.
              </p>
            </div>
            <div className="hidden lg:flex p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 items-center justify-center">
              <UserPlus className="w-20 h-20 text-white/90" />
            </div>
          </div>
        </motion.div>

        {/* Tabbed Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden p-6 sm:p-10"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {/* Custom Tab Triggers */}
            <TabsList className="grid w-full h-12 grid-cols-3 bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl mb-8 gap-2">
              <TabsTrigger
                value="student"
                className="rounded-xl py-1.5 text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-md flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Student Registration</span>
                <span className="sm:hidden">Student</span>
              </TabsTrigger>
              <TabsTrigger
                value="teacher"
                className="rounded-xl py-1.5 text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md flex items-center justify-center gap-2"
              >
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Teacher Registration</span>
                <span className="sm:hidden">Teacher</span>
              </TabsTrigger>
              <TabsTrigger
                value="staff"
                className="rounded-xl py-1.5 text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-md flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Staff Registration</span>
                <span className="sm:hidden">Staff</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB CONTENT 1: STUDENT */}
            <TabsContent value="student" className="space-y-6 focus:outline-none animate-fadeIn">
              <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="text-blue-600 dark:text-blue-400 w-5 h-5" /> Student Admission Details
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Fields marked with an asterisk (*) are mandatory for initial submission.
                </p>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-6">
                {/* Basic Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Full Name *
                    </label>
                    <Input
                      name="name" value={studentForm.name} onChange={handleStudentChange}
                      placeholder="e.g. Rahul Sharma" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Email Address *
                    </label>
                    <Input
                      type="email" name="email" value={studentForm.email} onChange={handleStudentChange}
                      placeholder="student@example.com" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Password *
                    </label>
                    <Input
                      type="password" name="password" value={studentForm.password} onChange={handleStudentChange}
                      placeholder="••••••••" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Demographics & Identity */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone Number
                    </label>
                    <Input
                      name="phone" value={studentForm.phone} onChange={handleStudentChange}
                      placeholder="+91 9876543210"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Aadhaar Number
                    </label>
                    <Input
                      name="adhar_no" value={studentForm.adhar_no} onChange={handleStudentChange}
                      placeholder="12-digit UIDAI"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Gender
                    </label>
                    <Select
                      value={studentForm.gender}
                      onValueChange={(val) => setStudentForm({ ...studentForm, gender: val })}
                    >
                      <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-10 px-3 text-sm">
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Blood Group
                    </label>
                    <Input
                      name="blood_group" value={studentForm.blood_group} onChange={handleStudentChange}
                      placeholder="e.g. B+"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Academic Placement */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-blue-100 dark:border-gray-800">
                  {/* Grade Selection */}
                  <ComboboxFormField
                    label="Target Grade"
                    required
                    items={grades}
                    placeholder="Select Grade"
                    searchPlaceholder="Search grade..."
                    field={{
                      value: studentForm.grade,
                      onChange: (val) => setStudentForm({ ...studentForm, grade: val })
                    }}
                    className="w-full"
                  />

                  {/* Class Selection */}
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
                    className="w-full"
                  />

                  {/* Academic Year Selection */}
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
                    className="w-full"
                  />

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Date of Birth
                    </label>
                    <Input
                      type="date" name="date_of_birth" value={studentForm.date_of_birth} onChange={handleStudentChange}
                      className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Parents Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Father's Name
                    </label>
                    <Input
                      name="fathers_name" value={studentForm.fathers_name} onChange={handleStudentChange}
                      placeholder="Father's Full Name"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Mother's Name
                    </label>
                    <Input
                      name="mothers_name" value={studentForm.mothers_name} onChange={handleStudentChange}
                      placeholder="Mother's Full Name"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Parent Contact Phone
                    </label>
                    <Input
                      name="parent_contact" value={studentForm.parent_contact} onChange={handleStudentChange}
                      placeholder="Emergency Mobile Number"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Residential Address
                  </label>
                  <Textarea
                    name="address" value={studentForm.address} onChange={handleStudentChange}
                    placeholder="Street, Landmark, City, State, Pincode" rows={2}
                    className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-blue-500"
                  />
                </div>

                <Button
                  type="submit" disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all duration-200"
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting Request...</> : 'Submit Student Admission Request'}
                </Button>
              </form>
            </TabsContent>

            {/* TAB CONTENT 2: TEACHER */}
            <TabsContent value="teacher" className="space-y-6 focus:outline-none animate-fadeIn">
              <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="text-indigo-600 dark:text-indigo-400 w-5 h-5" /> Faculty / Teacher Application
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Share your credentials to onboard as an educator. Employee code assignment occurs automatically upon administrative clearance.
                </p>
              </div>

              <form onSubmit={handleTeacherSubmit} className="space-y-6">
                {/* Base Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Full Name *
                    </label>
                    <Input
                      name="name" value={teacherForm.name} onChange={handleTeacherChange}
                      placeholder="e.g. Dr. Ananya Sen" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Email Address *
                    </label>
                    <Input
                      type="email" name="email" value={teacherForm.email} onChange={handleTeacherChange}
                      placeholder="faculty@example.com" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Password *
                    </label>
                    <Input
                      type="password" name="password" value={teacherForm.password} onChange={handleTeacherChange}
                      placeholder="••••••••" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Identity & Background */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone Number
                    </label>
                    <Input
                      name="phone" value={teacherForm.phone} onChange={handleTeacherChange}
                      placeholder="+91 9123456780"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Aadhaar Number
                    </label>
                    <Input
                      name="adhar_no" value={teacherForm.adhar_no} onChange={handleTeacherChange}
                      placeholder="12-digit UIDAI"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Gender
                    </label>
                    <Select
                      value={teacherForm.gender}
                      onValueChange={(val) => setTeacherForm({ ...teacherForm, gender: val })}
                    >
                      <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-10 px-3 text-sm">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Availability / Start Date
                    </label>
                    <Input
                      type="date" name="hire_date" value={teacherForm.hire_date} onChange={handleTeacherChange}
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Professional Qualifications */}
                <div className="bg-indigo-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-indigo-100 dark:border-gray-800 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Highest Qualification & Certifications
                    </label>
                    <Input
                      name="qualification" value={teacherForm.qualification} onChange={handleTeacherChange}
                      placeholder="e.g. M.Sc. in Physics, B.Ed., NET Qualified"
                      className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Professional Bio / Core Subject Specializations
                    </label>
                    <Textarea
                      name="bio" value={teacherForm.bio} onChange={handleTeacherChange}
                      placeholder="Brief overview of teaching methodology, years of experience, and subjects targeted." rows={2}
                      className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Correspondence Address
                  </label>
                  <Input
                    name="address" value={teacherForm.address} onChange={handleTeacherChange}
                    placeholder="House No, Suburb, City, Pincode"
                    className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-indigo-500"
                  />
                </div>

                <Button
                  type="submit" disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-base shadow-lg shadow-indigo-500/20 active:scale-[0.99] transition-all duration-200"
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting Application...</> : 'Submit Faculty Onboarding Application'}
                </Button>
              </form>
            </TabsContent>

            {/* TAB CONTENT 3: STAFF */}
            <TabsContent value="staff" className="space-y-6 focus:outline-none animate-fadeIn">
              <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="text-purple-600 dark:text-purple-400 w-5 h-5" /> Operational / Staff Registration
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Onboard administrative assistants, accountants, security personnel, drivers, and campus operational personnel.
                </p>
              </div>

              <form onSubmit={handleStaffSubmit} className="space-y-6">
                {/* Basic Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Full Name *
                    </label>
                    <Input
                      name="name" value={staffForm.name} onChange={handleStaffChange}
                      placeholder="e.g. Ramesh Chandra" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Email Address *
                    </label>
                    <Input
                      type="email" name="email" value={staffForm.email} onChange={handleStaffChange}
                      placeholder="staff@example.com" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Password *
                    </label>
                    <Input
                      type="password" name="password" value={staffForm.password} onChange={handleStaffChange}
                      placeholder="••••••••" required
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2.5 focus-visible:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Sub Role Selection mapped directly to user instruction */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-purple-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-purple-100 dark:border-gray-800">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 text-purple-800 dark:text-purple-300">
                      Assigned Sub Role *
                    </label>
                    <Input
                      name="sub_role" value={staffForm.sub_role} disabled
                      className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border-purple-100 dark:border-purple-900/50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <ComboboxFormField
                    label="Department Assignment (Role)"
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
                    className="w-full"
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Available Onboarding Date
                    </label>
                    <Input
                      type="date" name="hire_date" value={staffForm.hire_date} onChange={handleStaffChange}
                      className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Identity & Contact */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone Number
                    </label>
                    <Input
                      name="phone" value={staffForm.phone} onChange={handleStaffChange}
                      placeholder="+91 9888123456"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Aadhaar Number
                    </label>
                    <Input
                      name="adhar_no" value={staffForm.adhar_no} onChange={handleStaffChange}
                      placeholder="12-digit UIDAI"
                      className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Gender
                    </label>
                    <Select
                      value={staffForm.gender}
                      onValueChange={(val) => setStaffForm({ ...staffForm, gender: val })}
                    >
                      <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-10 px-3 text-sm">
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

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Contact Address
                  </label>
                  <Input
                    name="address" value={staffForm.address} onChange={handleStaffChange}
                    placeholder="Locality, Zone, City, Pincode"
                    className="rounded-xl border-gray-200 dark:border-gray-700 py-2 focus-visible:ring-purple-500"
                  />
                </div>

                <Button
                  type="submit" disabled={loading}
                  className="w-full py-4 rounded-xl text-white font-bold text-base shadow-lg shadow-purple-500/20 active:scale-[0.99] transition-all duration-200"
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting Record...</> : 'Submit Staff Registration Portal'}
                </Button>
              </form>
            </TabsContent>

          </Tabs>
        </motion.div>

        {/* Global Footer info */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} School Management System | Developed by <b className='text-primary tracking-wider'>MITHILESH INFODATASOFT CAREER RESEARCH ORGNISATION Pvt. Ltd.</b>
        </div>
      </div>
    </div>
  );
}
