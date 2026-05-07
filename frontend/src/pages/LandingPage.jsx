import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Users,
  Trophy,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  PlaySquare,
  Baby, // For Play Group
  Backpack, // For primary
  Library,
  Laptop,
  Activity,
  HeartPulse,
  Microscope,
  Palette,
  Bus,
  ShieldCheck,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  TwitterIcon,
  Camera,
  Heart,
  Sparkles,
  Download,
  FileText,
  Clock,
  Sun,
  Snowflake
} from 'lucide-react';
import { FaXTwitter, FaYoutube, FaWhatsapp } from "react-icons/fa6"; // fa6 = Font Awesome 6
import api from '../api';
// import { ring2 } from 'ldrs';
// ring2.register();
import { treadmill } from 'ldrs';
treadmill.register();
import logo from "@/assets/niyati_public_school_logo.png";
import ino1 from "@/assets/Inofration1.jpeg";
import ino2 from "@/assets/Inogration2.jpeg";
import ino3 from "@/assets/Inogration3.jpeg";
import ino4 from "@/assets/Inogration4.jpeg";
import ino5 from "@/assets/Inogration5.jpeg";
import ino6 from "@/assets/Inogration6.jpeg";
import ino7 from "@/assets/Inogration7.jpeg";
import s1 from "@/assets/student1.jpeg";
import s2 from "@/assets/student2.jpeg";
import s3 from "@/assets/student3.jpeg";
import s4 from "@/assets/student4.jpeg";
import s5 from "@/assets/Student5.jpeg";
import s6 from "@/assets/Student6.jpeg";
import s7 from "@/assets/Student7.jpeg";
import class1 from "@/assets/indian-teachers-indian-students-indian-teachers-day_978786-468541776526087.jpeg";
import scure_class from "@/assets/secureCampus1776526087.jpeg";
import welcome_board from "@/assets/SchoolWelocomeboard.jpeg";
import banner1 from "@/assets/Niyati_banner02.jpeg";
import banner2 from "@/assets/School_banner1.jpeg";
// import banner2 from "@/assets/School_banner1resize.jpeg";
import AdmissionPopup from './adminssionPopupForm';
import FacultymemberPopup from './facultymemberpopup';

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [0, -15, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const pulseAnimation = {
  initial: { scale: 1, opacity: 0.8 },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const BannerSlider = () => {
  const banners = [banner1, banner2, welcome_board];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length);
  };

  return (
    <div className="relative w-full overflow-hidden bg-slate-100 group pt-[112px] md:pt-[140px] pb-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full relative">
        <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[3/1] rounded-2xl overflow-hidden shadow-xl border border-slate-200/50">
          <div
            className="flex transition-transform duration-700 ease-in-out h-full"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {banners.map((banner, index) => (
              <div key={index} className="w-full h-full flex-shrink-0 relative">
                <img
                  src={banner}
                  alt={`School Banner ${index + 1}`}
                  className="w-full h-full object-fill object-center"
                />
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 backdrop-blur-sm"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 backdrop-blur-sm"
          >
            <ChevronRight size={24} />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-300 shadow-sm ${currentIndex === index ? 'bg-blue-600 scale-125 w-6 md:w-8' : 'bg-white/80 hover:bg-white'}`}
              ></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAdmissionPopup, setShowAdmissionPopup] = useState(false);
  const [showFacultymemberPopup, setShowFacultymemberPopup] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const { token, user } = useAuth();

  if (token || (user && user.id)) {
    return <Navigate to="/school/dashboard" replace />;
  }

  // Handle Scroll for Navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show admission popup on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAdmissionPopup(true);
    }, 2500); // 2.5 second delay
    return () => clearTimeout(timer);
  }, []);

  // Fetch public teachers
  // useEffect(() => {
  //   const fetchTeachers = async () => {
  //     try {
  //       const res = await api.get('/teachers/public');
  //       setTeachers(res.data.teachers || []);
  //     } catch (err) {
  //       console.error("Error fetching teachers", err);
  //     } finally {
  //       setLoadingTeachers(false);
  //     }
  //   };
  //   fetchTeachers();
  // }, []);

  // const handleDownloadTeacherPdf = (id) => {
  //   try {
  //     const backendBaseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
  //     window.open(`${backendBaseUrl}/teachers/public/${id}/download-pdf`, '_blank');
  //   } catch (error) {
  //     console.error("Error downloading teacher PDF", error);
  //   } finally {
  //     setLoadingTeachers(false);
  //   }
  // };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    // Add a slight delay to allow the mobile menu's unmount animation to settle 
    // so the browser doesn't abort the smooth scroll.
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 250);
  };

  const handleShowFacultymemberPopup = () => {
    setShowFacultymemberPopup(true);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-rose-50/30 font-sans text-slate-900 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* 1. Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-gradient-to-r from-blue-700 to-indigo-800 shadow-2xl py-1' : 'bg-transparent py-1'
          }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('home')}>
            <div className={`p-1 rounded-xl transition-colors ${isScrolled ? 'bg-white/0 backdrop-blur-sm' : 'bg-white/0'}`}>
              <img src={logo} alt="Niyati Public School Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className={`font-sekuya text-lg md:text-xl leading-tight tracking-tight transition-colors ${isScrolled ? 'text-white' : 'text-blue-900'}`} style={{ fontFamily: 'Sekuya' }}>Niyati Public School</span>
              <span className={`text-xs destiny md:text-sm font-bold tracking-widest transition-colors text-right ${isScrolled ? 'text-blue-100' : 'text-slate-600'}`}>Destiny for Excellence</span>

              <div className="hidden md:flex justify-center md:mt-1">
                <motion.a
                  href="tel:9934795151"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  whileHover={{ scale: [1, 1.05, 1] }}
                  whileTap={{ scale: [1, 1.05, 1] }}
                  className="text-sm relative inline-flex items-center gap-2 px-2 py-1 rounded-full 
                            bg-gradient-to-r from-blue-500 to-indigo-500 
                            text-white font-semibold shadow-lg overflow-hidden"
                >
                  {/* Glow Effect */}
                  <motion.span
                    className="absolute inset-0 rounded-full bg-white opacity-20"
                    animate={{
                      scale: [1, 1.6, 1],
                      opacity: [0.2, 0, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />

                  {/* Phone Icon */}
                  <motion.span
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  >
                    📞
                  </motion.span>

                  +91-9934795151
                </motion.a>
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {['Home', 'Inauguration', 'Programs', 'Facilities', 'Gallery'].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase())}
                className={`font-bold text-sm transition-all relative group ${isScrolled ? 'text-white hover:text-blue-200' : 'text-slate-700 hover:text-blue-600'}`}
              >
                {item}
                <span className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all group-hover:w-full ${isScrolled ? 'bg-white' : 'bg-blue-600'}`}></span>
              </button>
            ))}
            <Link to="/contact" className={`px-5 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isScrolled ? 'bg-white text-blue-700 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              Contact Us
            </Link>
            <Link to="/login" className={`px-5 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isScrolled ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              Login
            </Link>
          </nav>

          <div className="block md:hidden">
            <motion.a
              href="tel:9934795151"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              whileHover={{ scale: [1, 1.05, 1] }}
              whileTap={{ scale: [1, 1.05, 1] }}
              className="relative inline-flex items-center p-1 rounded-full 
                            bg-white text-blue-600 shadow-lg overflow-hidden"
            >
              {/* Glow Effect */}
              <motion.span
                className="absolute inset-0 rounded-full bg-white opacity-20"
                animate={{
                  scale: [1, 1.6, 1],
                  opacity: [0.2, 0, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />

              {/* Phone Icon */}
              <motion.span
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              >
                📞
              </motion.span>
            </motion.a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={`lg:hidden transition-colors pl-3 ${isScrolled ? 'text-white' : 'text-slate-700'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Expanded */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-[114px] left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-40 lg:hidden overflow-hidden"
          >
            <div className="flex flex-col px-6 py-4 gap-4">
              {['Home', 'Inauguration', 'Programs', 'Facilities', 'Gallery'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  className="text-left text-lg font-medium text-slate-700 py-2 border-b border-slate-100"
                >
                  {item}
                </button>
              ))}
              <Link to="/contact" className="bg-blue-600 text-white text-center rounded-lg py-3 mt-2 font-medium">
                Contact Us
              </Link>
              <Link to="/login" className="bg-blue-600 text-white text-center rounded-lg py-3 mt-2 font-medium">
                Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* 1.5 Sliding Banner Section */}
        <BannerSlider />

        {/* 2. Hero Section */}
        <section id="home" className="relative pt-12 pb-20 lg:pt-16 lg:pb-32 overflow-hidden bg-gradient-to-b from-blue-100 via-white to-blue-50/40">
          {/* Background Decorative Blur */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-400/30 rounded-full blur-[120px] -z-10 mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-0 left-[-100px] w-[500px] h-[500px] bg-rose-400/20 rounded-full blur-[100px] -z-10 mix-blend-multiply animate-pulse" style={{ animationDuration: '12s' }}></div>
          <div className="absolute top-[30%] left-[10%] w-[400px] h-[400px] bg-amber-200/20 rounded-full blur-[80px] -z-10 mix-blend-multiply animate-pulse" style={{ animationDuration: '10s' }}></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="max-w-2xl"
              >
                <motion.div variants={fadeInUp} className="inline-block mb-4 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm border border-amber-200 shadow-sm">
                  ⭐ Dedicated to providing quality education for children
                </motion.div>

                <motion.h1 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                  Education for a <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Bright Future.</span>
                </motion.h1>

                <motion.p variants={fadeInUp} className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                  We nurture young minds, fostering creativity, academic excellence, and holistic development in a state-of-the-art environment.
                </motion.p>

                <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 items-center">
                  <span className="inline-block bg-green-50 text-green-700 font-bold px-6 py-3 rounded-full border border-green-200 uppercase tracking-wide text-sm shadow-sm animate-pulse">
                    Admission Open Free
                  </span>
                  <Link to="/contact" className="inline-flex items-center gap-2 group text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                    Contact Us
                    <div className="bg-blue-100 p-2 rounded-full group-hover:bg-blue-200 transition-colors">
                      <ChevronRight size={16} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>

                <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Globe size={16} />
                    </div>
                    English Medium
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <BookOpen size={16} />
                    </div>
                    CBSE Pattern
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users size={16} />
                    </div>
                    Co-Education
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                {/* Hero Graphic Composition */}
                <div className="relative w-full aspect-square max-w-lg mx-auto">
                  {/* Circle Background */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-tr from-blue-200/40 via-indigo-100/30 to-purple-100/40 rounded-full scale-90 border-[20px] border-white/50"
                  ></motion.div>

                  {/* Placeholder for Hero Image - using colorful divs with icons as a creative alternative since we don't have the exact image */}
                  <motion.div
                    variants={floatingAnimation}
                    initial="initial"
                    animate="animate"
                    className="absolute top-[10%] right-[10%] w-[45%] h-[45%] bg-yellow-400 rounded-3xl rotate-3 shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white z-10"
                  >
                    <img src={welcome_board} alt="Happy student" className="object-cover w-full h-full opacity-95 hover:scale-110 transition-transform duration-700" />
                  </motion.div>
                  <motion.div
                    variants={floatingAnimation}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.5, duration: 3.5 }}
                    className="absolute bottom-[10%] left-[10%] w-[50%] h-[40%] bg-blue-500 rounded-3xl -rotate-6 shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white z-10"
                  >
                    <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=400&h=300" alt="Students learning" className="object-cover w-full h-full opacity-95 hover:scale-110 transition-transform duration-700" />
                  </motion.div>
                  <motion.div
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                    className="absolute top-[20%] left-[5%] w-[35%] h-[35%] bg-rose-400 rounded-full shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white z-20"
                  >
                    <img src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=300&h=300" alt="Books" className="object-cover w-full h-full opacity-95" />
                  </motion.div>

                  {/* Decorative Elements */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-0 right-[20%] w-8 h-8 bg-blue-400 rounded-full blur-sm"
                  ></motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
                    transition={{ duration: 6, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-[15%] right-0 w-12 h-12 bg-rose-300 rounded-full blur-md"
                  ></motion.div>

                  {/* Floating Badge */}
                  <motion.div
                    variants={floatingAnimation}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 1 }}
                    className="absolute bottom-[25%] right-[2%] bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-30 border border-blue-50"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Estd. 2026</div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-tighter text-nowrap whitespace-nowrap">Danapur, Patna</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* WhatsApp Floating Button */}
        <motion.a
          href="https://wa.me/919934795151"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:bg-[#128C7E] transition-colors group"
          title="Chat on WhatsApp"
        >
          <FaWhatsapp size={32} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-500 font-bold whitespace-nowrap">
            Chat with us
          </span>
        </motion.a>

        {/* 3. Stats Strip */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { value: 'CBSE', label: 'Curriculum' },
                { value: 'Play Group', label: 'Nursery - LKG - UKG' },
                { value: '1st - 8th', label: 'Primary & Secondary' },
                { value: '25+', label: 'Expert Faculty Members' }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="text-center"
                >
                  <motion.div
                    initial={{ scale: 0.5 }}
                    whileInView={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 100, delay: idx * 0.1 + 0.2 }}
                    className="text-3xl md:text-4xl font-bold text-white mb-2"
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-slate-400 text-sm md:text-base font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Inauguration Section */}
        <section id="inauguration" className="py-20 lg:py-32 bg-white relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-300 rounded-full blur-3xl -z-10 opacity-30 animate-pulse"></div>
          <div className="absolute top-1/4 right-0 w-80 h-80 bg-rose-200 rounded-full blur-[100px] -z-10 opacity-40 animate-pulse" style={{ animationDuration: '7s' }}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl -z-10 opacity-50 animate-pulse" style={{ animationDuration: '10s' }}></div>
          <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-amber-100 rounded-full blur-[80px] -z-10 opacity-30 animate-pulse" style={{ animationDuration: '12s' }}></div>

          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-16">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block"
              >
                A New Beginning
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl font-extrabold text-slate-900"
              >
                Grand Inauguration Ceremony
              </motion.h2>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: 80 }}
                className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mt-6 rounded-full"
              ></motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {/* Row 1 Left */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-[2rem] overflow-hidden shadow-xl h-72 md:h-96 group"
              >
                <img src={ino1} alt="Inauguration Moment 1" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </motion.div>

              {/* CENTER HIGHLIGHT - Inogration 7 (God Image) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="md:row-span-2 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white relative group h-[500px] md:h-full z-10"
              >
                <img src={ino7} alt="Divine Inauguration" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/20 to-transparent flex items-end justify-center p-10">
                  <div className="text-center">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="bg-amber-400 text-blue-900 text-xs font-black px-4 py-1.5 rounded-full uppercase mb-4 inline-block shadow-lg"
                    >
                      Divine Blessing
                    </motion.div>
                    <h3 className="text-white text-3xl font-bold mb-2">The Auspicious Start</h3>
                    <p className="text-blue-100 text-sm font-medium">Commencing our journey with grace and tradition</p>
                  </div>
                </div>
              </motion.div>

              {/* Row 1 Right */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-[2rem] overflow-hidden shadow-xl h-72 md:h-96 group"
              >
                <img src={ino2} alt="Inauguration Moment 2" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </motion.div>

              {/* Row 2 Left */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="rounded-[2rem] overflow-hidden shadow-xl h-64 md:h-80 group"
              >
                <img src={ino3} alt="Inauguration Moment 3" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </motion.div>

              {/* Skip center as it's row-span-2 */}

              {/* Row 2 Right */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="rounded-[2rem] overflow-hidden shadow-xl h-64 md:h-80 group"
              >
                <img src={ino4} alt="Inauguration Moment 4" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </motion.div>

              {/* Row 3 - The remaining 2 images bottom */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-[2rem] overflow-hidden shadow-xl h-64 md:h-72 group"
                >
                  <img src={ino5} alt="Inauguration Moment 5" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-[2rem] overflow-hidden shadow-xl h-64 md:h-72 group"
                >
                  <img src={ino6} alt="Inauguration Moment 6" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </motion.div>
              </div>
            </div>
          </div>
        </section>        {/* Faculty & Excellence Counts - Automatic Slide */}
        <section className="py-20 lg:py-24 bg-white overflow-hidden border-y border-slate-100">
          <div className="container mx-auto px-4 max-w-7xl mb-12">
            <div className="text-center">
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block"
              >
                Our Reach & Strength
              </motion.span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Education by the Numbers</h2>
              <div className="w-20 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mt-6 rounded-full"></div>
            </div>
          </div>

          {/* Infinite Scroll Tape */}
          <div className="relative flex overflow-hidden group">
            <motion.div
              className="flex whitespace-nowrap gap-6 py-4"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              {/* Duplicate the array to create seamless loop */}
              {[...Array(2)].map((_, outerIdx) => (
                <React.Fragment key={outerIdx}>
                  {[
                    { label: "Students", count: "100+", icon: GraduationCap, color: "from-blue-500 to-indigo-600" },
                    { label: "Expert Teachers", count: "25+", icon: Users, color: "from-rose-500 to-pink-600" },
                    { label: "Support Staff", count: "15+", icon: Heart, color: "from-amber-500 to-orange-600" },
                    { label: "Classes", count: "10+", icon: Laptop, color: "from-emerald-500 to-teal-600" },
                    { label: "Safety Rating", count: "100%", icon: ShieldCheck, color: "from-blue-400 to-cyan-500" },
                    // { label: "Modern Labs", count: "05+", icon: Microscope, color: "from-purple-500 to-violet-600" },
                  ].map((stat, i) => (
                    <div
                      key={`${outerIdx}-${i}`}
                      className="inline-flex items-center gap-6 bg-white border border-slate-100 px-8 py-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgb(0,0,0,0.08)] transition-all group/card hover:-translate-y-1"
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg group-hover/card:scale-110 transition-transform`}>
                        <stat.icon size={32} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-slate-800 leading-none mb-1">{stat.count}</span>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">{stat.label}</span>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </motion.div>

            {/* Side Fades for smooth look */}
            <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
          </div>

          <div className="mt-16 text-center">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-slate-500 font-medium max-w-2xl mx-auto px-4"
            >
              Our dedicated faculty and growing student community are the heartbeat of Niyati Public School.
              We invite you to be a part of this flourishing educational journey.
            </motion.p>
          </div>
        </section>

        {/* 4. Our Programs Section */}
        <section id="programs" className="py-20 lg:py-32 bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

          {/* Color Splashes */}
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-200/20 rounded-full blur-[100px] -z-10 animate-pulse" style={{ animationDuration: '9s' }}></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDuration: '11s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100/10 rounded-full blur-[150px] -z-10"></div>
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-16">
              <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block">Academics</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Our Programs</h2>
              <div className="w-20 h-1.5 bg-blue-600 mx-auto mt-6 rounded-full"></div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Play Group', age: '2 - 3 Years', icon: Baby, color: 'bg-rose-100', iconColor: 'text-rose-600', desc: 'A playful start for toddlers with sensory activities, story-telling, and social interaction.', borderColor: 'border-rose-200' },
                { title: 'Nursery', age: '3 - 4 Years', icon: PlaySquare, color: 'bg-amber-100', iconColor: 'text-amber-600', desc: 'Building foundational skills through creative play, rhymes, and basic identification.', borderColor: 'border-amber-200' },
                { title: 'LKG - UKG', age: '4 - 6 Years', icon: BookOpen, color: 'bg-emerald-100', iconColor: 'text-emerald-600', desc: 'Preparing for formal schooling with introduction to phonics, numbers, and writing skills.', borderColor: 'border-emerald-200' },
                { title: 'Primary & Sec.', age: '1st - 8th Std', icon: Backpack, color: 'bg-blue-100', iconColor: 'text-blue-600', desc: 'Comprehensive academic growth with focus on core subjects, logic, and self-expression.', borderColor: 'border-blue-200' },
              ].map((prog, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className={`bg-white border ${prog.borderColor} p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all group hover:-translate-y-2 relative overflow-hidden`}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 ${prog.color} opacity-20 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-150 duration-500`}></div>
                  <div className={`w-16 h-16 ${prog.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10 shadow-sm`}>
                    <prog.icon className={`w-8 h-8 ${prog.iconColor}`} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">{prog.title}</h3>
                  <p className={`text-sm font-bold mb-4 px-3 py-1 rounded-full inline-block ${prog.color} ${prog.iconColor} relative z-10`}>{prog.age}</p>
                  <p className="text-slate-600 text-sm leading-relaxed relative z-10 font-medium">
                    {prog.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 4.5 Teacher Roster Section */}
        <section id="teachers" className="py-20 lg:py-32 bg-slate-50 relative overflow-hidden">
          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <div className="text-center mb-16">
              <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block">Our Mentors</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Meet Our Faculty</h2>
              <div className="w-20 h-1.5 bg-blue-600 mx-auto mt-6 rounded-full"></div>
            </div>
            <div className="flex justify-center mt-12">
              <button
                onClick={handleShowFacultymemberPopup}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 transform hover:scale-105"
              >
                <Users size={24} /> View All Faculty Members
              </button>
            </div>
            <FacultymemberPopup isOpen={showFacultymemberPopup} onClose={() => setShowFacultymemberPopup(false)} />
          </div>
        </section>

        {/* 4.6 Student Guidelines & Uniform */}
        <section className="py-20 bg-white relative border-y border-slate-100">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              {/* Uniform details */}
              <div className="lg:w-1/2">
                <div className="inline-flex items-center gap-2 mb-4 bg-emerald-50 px-4 py-1.5 rounded-full">
                  <FileText size={16} className="text-emerald-600" />
                  <span className="text-emerald-700 font-bold tracking-wider uppercase text-xs">Dress Code</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">School Uniform</h2>
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Sun size={20} className="text-amber-500" /> Summer Uniform
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      Boys: Half sleeve shirt (with school logo), tailored trousers/shorts, school belt, tie, and black leather shoes with standard socks.<br />
                      Girls: Pleated skirt/tunic or salwar kameez as prescribed, half sleeve shirt, school belt, tie, black shoes, and standard socks.
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Snowflake size={20} className="text-blue-500" /> Winter Uniform
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      Additional to summer wear: Navy blue V-neck pullover with school crest, school blazer, full-length trousers for both boys and girls.
                    </p>
                  </div>
                </div>
              </div>

              {/* General Guidelines */}
              <div className="lg:w-1/2 mb-16">
                <div className="inline-flex items-center gap-2 mb-4 bg-indigo-50 px-4 py-1.5 rounded-full">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <span className="text-indigo-700 font-bold tracking-wider uppercase text-xs">Rules & Conduct</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Student Guidelines</h2>
                <div className="bg-indigo-50/50 rounded-2xl p-6 md:p-8 border border-indigo-100/50 h-full">
                  <ul className="space-y-4">
                    {[
                      "Students must maintain strict punctuality and attend morning assembly.",
                      "Respect for teachers, staff, and fellow students is mandatory.",
                      "Damage to school property will be subject to disciplinary action.",
                      "Mobile phones and electronic gadgets are strictly prohibited on campus.",
                      "A minimum of 75% attendance is required to appear in final examinations."
                    ].map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-indigo-600 text-xs font-bold">{idx + 1}</span>
                        </div>
                        <p className="text-slate-700 text-sm md:text-base leading-relaxed">{rule}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Facilities / Features */}
        <section id="facilities" className="py-20 lg:py-32 bg-gradient-to-br from-slate-50 via-blue-50/30 to-rose-50/30">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-16 items-center">

              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="lg:w-1/3"
              >
                <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block">Environment</span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Our Campus</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  We provide a focused, safe, and hygienic environment designed to support a comprehensive educational experience. Our spacious classrooms are crafted for excellence in early learning.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    "Spacious, well-ventilated classrooms",
                    "Dedicated spaces for art & craft",
                    "Clean and hygienic campus",
                    "Safe and secure environment"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck size={14} className="text-blue-600" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                {[
                  { title: "Spacious Classrooms", img: class1, icon: BookOpen },
                  { title: "Safe Campus", img: scure_class, icon: ShieldCheck },
                  { title: "Activity Space", img: "https://images.unsplash.com/photo-1511949860663-92c5c57d48a7?w=800&q=80", icon: Activity },
                  { title: "Art & Craft", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80", icon: Palette }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative rounded-2xl overflow-hidden aspect-video group cursor-pointer shadow-sm"
                  >
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md mb-2 flex items-center justify-center">
                        <item.icon size={16} className="text-white" />
                      </div>
                      <h4 className="font-bold text-sm md:text-base">{item.title}</h4>
                    </div>
                  </motion.div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* 6. Gallery Section */}
        <section id="gallery" className="py-20 lg:py-32 bg-gradient-to-tr from-white via-slate-50/50 to-blue-50/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-[120px] -z-10 opacity-20 animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-rose-400 rounded-full blur-[100px] -z-10 opacity-15 animate-pulse" style={{ animationDuration: '10s' }}></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-[120px] -z-10 opacity-20 animate-pulse" style={{ animationDuration: '12s' }}></div>
          <div className="absolute bottom-1/2 right-1/4 w-64 h-64 bg-amber-300 rounded-full blur-[80px] -z-10 opacity-15 animate-pulse" style={{ animationDuration: '9s' }}></div>

          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-3 bg-blue-50 px-4 py-1.5 rounded-full">
                <Camera size={14} className="text-blue-600" />
                <span className="text-blue-600 font-bold tracking-wider uppercase text-xs">Our Gallery</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Captured Moments</h2>
              <div className="w-20 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mt-6 rounded-full"></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { img: ino7, title: "Grand Inauguration" },
                { img: s1, title: "Student Life" },
                { img: s2, title: "Creative Learning" },
                { img: s3, title: "Classroom Magic" },
                { img: s4, title: "Junior Scholars" },
                { img: s5, title: "Art & Expressions" },
                { img: s6, title: "Campus Life" },
                { img: s7, title: "Future Leaders" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative overflow-hidden rounded-[2rem] shadow-lg cursor-pointer aspect-[3/4] bg-slate-100"
                >
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <div>
                      <h4 className="text-white font-bold text-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{item.title}</h4>
                      <p className="text-slate-200 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">Niyati Public School</p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-50 group-hover:scale-100">
                    <Sparkles size={16} className="text-white" />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <button onClick={() => window.open("https://www.instagram.com/niyatipublicschool", "_blank")} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-xl hover:shadow-blue-200 hover:-translate-y-1 flex items-center gap-2 mx-auto">
                <Instagram size={20} />
                Follow us for more
              </button>
            </div>
          </div>
        </section>
        {/* 5.5 Map and Contact Info */}
        <section className="py-20 bg-slate-50 relative border-t border-slate-100">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-12 bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">

              {/* Left Side: Map */}
              <div className="lg:w-1/2 h-[400px] lg:h-auto min-h-[400px]">
                <iframe
                  title="School Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3597.3111190740406!2d85.04944377409868!3d25.6277977774363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39ed578364fd0a81%3A0xa1e5e966f047c44e!2sNIYATI%20PUBLIC%20SCHOOL!5e0!3m2!1sen!2sin!4v1775928678666!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>

              {/* Right Side: Timings & Contact */}
              <div className="lg:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                <div className="inline-flex w-fit items-center gap-2 mb-4 bg-blue-50 px-4 py-1.5 rounded-full">
                  <MapPin size={16} className="text-blue-600" />
                  <span className="text-blue-700 font-bold tracking-wider uppercase text-xs">Find Us</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Location & Timings</h2>

                <div className="space-y-6">
                  {/* Timings */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-500">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 mb-2">School Timings</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Sun size={16} className="text-amber-500" />
                          <span className="font-semibold">Summer:</span> 7:00 AM - 1:00 PM
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Snowflake size={16} className="text-blue-400" />
                          <span className="font-semibold">Winter:</span> 8:00 AM - 2:00 PM
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-100"></div>

                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-500">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 mb-1">Campus Address</h4>
                      <p className="text-slate-600 leading-relaxed text-sm">
                        New Gosai Tola, Near Hanuman Mandir,<br />
                        Gola Road, Danapur, Patna, Bihar, India
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 mb-1">Email Us</h4>
                      <a href="mailto:niyatipublicschool@gmail.com" className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium">
                        niyatipublicschool@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer & Contact */}
      <footer id="contact" className="bg-slate-900 text-slate-300 py-16 relative border-t-[8px] border-blue-600">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

            {/* Brand */}
            <div className="col-span-1 lg:col-span-1">
              <div className="bg-white/0 p-1 rounded-xl inline-block mb-6 shadow-lg">
                <img src={logo} alt="Niyati Public School" className=" h-28 md:h-32 object-contain mx-auto" />
              </div>
              <div className="flex flex-col w-72">
                <span className="text-base font-sekuya tracking-wider text-white/90">
                  Niyati Public School
                </span>
                <span className="text-[14px] text-right pr-5 text-white/90 tracking-wider font-semibold">
                  Destiny for Excellence
                </span>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Dedicated to the quality education for children since 2026.
                </p>
              </div>

              {/* <h3 className="text-white font-sekuya mb-1">Niyati Public School</h3>
              <h4 className="text-slate-300 font-bold text-sm mb-2 text-right">Destiny for Excellence</h4> */}
              {/* <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Dedicated to the quality education for children since 2026.
              </p> */}
              <div className="flex gap-4">
                {/* Social links placeholders */}
                {['facebook', 'twitter', 'instagram', 'youtube'].map((social) => (
                  <a key={social} href={social == "facebook" ? "https://www.facebook.com/niyatipublicschool" : social == "twitter" ? "https://x.com/niyatipublicschool" : social == "instagram" ? "https://www.instagram.com/niyatipublicschool" : "https://www.youtube.com/@niyatipublicschool"} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors text-white">
                    <span className="">{social == "facebook" ? <Facebook /> : social == "twitter" ? <FaXTwitter /> : social == "instagram" ? <Instagram /> : <FaYoutube />}</span>
                    {/* <div className="w-4 h-4 bg-current"></div> */}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Quick Links
              </h4>
              <ul className="space-y-3 font-medium">
                {['Home', 'Inauguration', 'Programs', 'Facilities', 'Gallery', 'Contact Us'].map((link) => (
                  <li key={link}>
                    <button onClick={() => scrollToSection(link.toLowerCase())} className="hover:text-blue-400 transition-colors flex items-center gap-2">
                      <ChevronRight size={14} className="text-slate-600" /> {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Info */}
            <div className="lg:col-span-2">
              <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Contact Information
              </h4>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h5 className="text-white font-semibold mb-1">Campus Address</h5>
                    <p className="text-slate-400 text-sm">New Gosai Tola, Near Hanuman Mandir, Gola Road, Danapur, Patna, Bihar, India</p>
                  </div>
                </div>

                <div className="w-full h-px bg-slate-700/50"></div>

                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
                      <Phone size={20} />
                    </div>
                    <div>
                      <h5 className="text-white font-semibold mb-1">Phone</h5>
                      <p className="text-slate-400 text-sm flex flex-col">
                        <a href="tel:9934795151" className="hover:text-white">9934795151</a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h5 className="text-white font-semibold mb-1">Email</h5>
                      <a href="mailto:niyatipublicschool@gmail.com" className="text-slate-400 text-sm hover:text-white break-all">
                        niyatipublicschool@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium">
            <p>&copy; {new Date().getFullYear()} Niyati Public School. All rights reserved.</p>
            <p className="text-slate-500">
              Developed by <span className="text-blue-500">MITHILESH INFODATASOFT CAREER RESEARCH ORGANISATION PRIVATE LIMITED</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Admission Inquiry Popup */}
      <AdmissionPopup
        isOpen={showAdmissionPopup}
        onClose={() => setShowAdmissionPopup(false)}
      />

    </div>
  );
};

export default LandingPage;
