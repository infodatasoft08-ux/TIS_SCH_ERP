import React, { useState } from 'react';
import { ArrowLeft, MapPin, Phone, Mail, Send, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';
import { toast } from 'sonner';

export default function Contact() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await API.post('/auth/contact', formData);
      if (response.data.success) {
        toast.success(response.data.message || 'Message sent successfully!');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          message: ''
        });
        // Optionally redirect back to login
        // navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">

        <div className="grid grid-cols-1 lg:grid-cols-2">

          {/* Left Side: Contact Form */}
          <div className="p-8 lg:p-12 order-2 lg:order-1 flex flex-col justify-center">

            <div className="mb-8">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Get in Touch</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Have questions or need assistance? Fill out the form below and our administrative team will reach out to you shortly.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Side: Map & Info */}
          <div className="order-1 lg:order-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 lg:p-12 text-white relative overflow-hidden flex flex-col justify-between">
            {/* Background shapes */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl point-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl point-events-none"></div>

            <div className="relative z-10 h-full flex flex-col">
              <div className="mb-8">
                <h3 className="text-3xl font-bold mb-2">School Location & Info</h3>
                <p className="text-blue-100/90 text-sm">Find us at our main campus or reach out via our contact details.</p>
              </div>

              {/* Contact Information Cards */}
              <div className="space-y-6 mb-8 flex-grow">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Address</h4>
                    <p className="text-blue-100/80 text-sm mt-1 leading-relaxed">
                      TIMES INTERNATIONAL SCHOOL<br />
                      J57H+PG6, Mohammadpur Rd, Sultanganj,<br />
                      Muhammadpur, Patna, Bihar 800006
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Mobile Number</h4>
                    <p className="text-blue-100/80 text-sm mt-1">
                      <a href="tel:8700186374" className="hover:underline">+91 8700186374</a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Email</h4>
                    <p className="text-blue-100/80 text-sm mt-1">
                      timesschoolpatna3@gmail.com<br />
                    </p>
                  </div>
                </div>
              </div>

              {/* Google Map Embedded */}
              <div className="w-full h-64 md:h-80 rounded-xl overflow-hidden shadow-lg border border-white/20 mt-auto flex-shrink-0">
                <iframe
                  title="School Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3597.7326101722388!2d85.1795!3d25.6138!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39ed59235b05354f%3A0xe6a19a47bafd2984!2sTimes%20International%20School!5e0!3m2!1sen!2sin!4v1778173356113!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full object-cover filter contrast-[1.1]"
                ></iframe>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
