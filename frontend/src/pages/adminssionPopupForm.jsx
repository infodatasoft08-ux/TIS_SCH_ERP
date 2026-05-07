import React, { useState } from 'react';
import { Send, Loader2, X } from 'lucide-react';
import API from '../api';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdmissionPopup({ isOpen, onClose }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        class: '',
        message: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            const response = await API.post('/auth/admission-inquiry', formData);
            if (response.data.success) {
                toast.success(response.data.message || 'Admission inquiry sent successfully!');
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    class: '',
                    message: ''
                });
                onClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send inquiry.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95%] md:max-w-2xl  p-0 gap-0 overflow-hidden border-none rounded-[1rem] md:rounded-[1.5rem] bg-white dark:bg-gray-900 shadow-2xl">
                {/* Header Section - Fixed */}
                <DialogHeader className="relative p-4 md:p-6 pb-4 md:pb-6 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md z-10">
                    <div className="flex flex-col items-start space-y-2">
                        <div className='flex'>
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mr-2 animate-pulse" />
                                Admissions Open
                            </div>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all hover:scale-110 text-gray-500 hover:text-gray-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <DialogTitle className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            Inquiry Form
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                            Fill out this form and our admission team will contact you shortly.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {/* Form Content - Scrollable */}
                <ScrollArea className="max-h-[50vh] md:max-h-[60vh] lg:max-h-[60vh]">
                    <form id="admission-inquiry-form" onSubmit={handleSubmit} className="p-6 md:p-10 pt-4 md:pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 group">
                                <label htmlFor="firstName" className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-600">
                                    Student First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="block w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 px-5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-white shadow-sm"
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2 group">
                                <label htmlFor="lastName" className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-600">
                                    Student Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="block w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 px-5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-white shadow-sm"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 group">
                                <label htmlFor="email" className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-600">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="block w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 px-5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-white shadow-sm"
                                    placeholder="john.doe@example.com"
                                />
                            </div>
                            <div className="space-y-2 group">
                                <label htmlFor="phone" className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-600">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="block w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 px-5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-white shadow-sm"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label htmlFor="class" className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-600">
                                Seeking Admission for Class <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="class"
                                name="class"
                                type="text"
                                required
                                value={formData.class}
                                onChange={handleChange}
                                className="block w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 px-5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-white shadow-sm"
                                placeholder="e.g. Class 1, Nursery, etc."
                            />
                        </div>

                        <div className="space-y-2 group">
                            <label htmlFor="message" className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-600">
                                Any additional Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                rows={3}
                                value={formData.message}
                                onChange={handleChange}
                                className="block w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 px-5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-white resize-none shadow-sm"
                                placeholder="How can we help you?"
                            />
                        </div>
                    </form>
                </ScrollArea>

                {/* Footer Section - Fixed */}
                <DialogFooter className="p-6 md:p-10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-10">
                    <button
                        form="admission-inquiry-form"
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                <span>Submit Inquiry</span>
                            </>
                        )}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
