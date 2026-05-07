import React, { useEffect, useState } from 'react';
import { Send, Loader2, X, Users, Download } from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { treadmill } from 'ldrs';
treadmill.register();

export default function FacultymemberPopup({ isOpen, onClose }) {
    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(true);

    // Fetch public teachers
    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const res = await API.get('/teachers/public');
                setTeachers(res.data.teachers || []);
            } catch (err) {
                console.error("Error fetching teachers", err);
            } finally {
                setLoadingTeachers(false);
            }
        };
        fetchTeachers();
    }, []);

    const handleDownloadTeacherPdf = (id) => {
        try {
            const backendBaseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
            window.open(`${backendBaseUrl}/teachers/public/${id}/download-pdf`, '_blank');
        } catch (error) {
            console.error("Error downloading teacher PDF", error);
        } finally {
            setLoadingTeachers(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95%] md:max-w-7xl  p-2 border-none rounded-[1rem] md:rounded-[1.5rem] bg-white dark:bg-gray-900 shadow-2xl">
                {/* Header Section - Fixed */}
                <DialogHeader className="relative p-4 md:p-6 pb-4 md:pb-6 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md z-10">
                    <div className="flex flex-col items-start space-y-2">
                        <div className='flex'>
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mr-2 animate-pulse" />
                                Faculty Members
                            </div>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all hover:scale-110 text-gray-500 hover:text-gray-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <DialogTitle className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            Faculty Members
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                            Meet our experienced and dedicated faculty members who are committed to providing quality education to our students.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {/* Form Content - Scrollable */}
                <ScrollArea className="max-h-[50vh] md:max-h-[60vh] lg:max-h-[60vh]">
                    {loadingTeachers ? (
                        <div className="flex justify-center items-center py-20">
                            {/* <l-ring2 size="40" stroke="5" stroke-length="0.25" bg-opacity="0.1" speed="0.8" color="#2563eb"></l-ring2> */}
                            <l-treadmill size="70" speed="10" color="blue"></l-treadmill>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                            {teachers.map((teacher, idx) => (
                                <motion.div
                                    key={teacher.teacher_id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                                    className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all group flex flex-col h-full border border-slate-100 cursor-pointer"
                                    onClick={() => handleDownloadTeacherPdf(teacher.teacher_id)}
                                >
                                    <div className="aspect-square w-full h-48 overflow-hidden relative bg-blue-50">
                                        {teacher.user_avatar_url ? (
                                            <img
                                                src={teacher.user_avatar_url}
                                                alt={teacher.user_name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Users size={64} strokeWidth={1} />
                                            </div>
                                        )}

                                        {/* PDF Download overlay */}
                                        <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                                            <div className="bg-white text-blue-700 px-4 py-2 rounded-full font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                <Download size={16} /> Download Profile
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 flex flex-col flex-grow text-center">
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">{teacher.user_name}</h3>
                                        <p className="text-blue-600 text-sm font-semibold mb-3">{teacher.qualification || 'Educator'}</p>

                                        {teacher.subjects && teacher.subjects.length > 0 && (
                                            <div className="mt-auto pt-4 border-t border-slate-100">
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {teacher.subjects.slice(0, 2).map((sub, i) => (
                                                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                                                            {sub.name}
                                                        </span>
                                                    ))}
                                                    {teacher.subjects.length > 2 && (
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                                                            +{teacher.subjects.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer Section - Fixed */}
                {/* <DialogFooter className="p-6 md:p-10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-10">
                    <button
                        onClick={onClose}
                        className="group relative w-full flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98]"
                    >
                        {loadingTeachers ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                <span>Loading...</span>
                            </>
                        ) : (
                            <>
                                <X className="mr-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                <span>Close</span>
                            </>
                        )}
                    </button>
                </DialogFooter> */}
            </DialogContent>
        </Dialog>
    );
}