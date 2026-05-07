import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Eye, Megaphone, Edit, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const audienceColors = {
    all: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    students: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    teachers: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    staff: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    parents: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
};

export default function NoticeCard({ notice, className, onEdit, onDelete }) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDownload = async (imageUrl, title) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${title.replace(/\s+/g, '_')}_notice.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    return (
        <Card className={cn("overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full", className)}>
            {notice.image_url && (
                <div className="h-48 overflow-hidden bg-gray-100 relative group">
                    <img
                        src={notice.image_url}
                        alt={notice.title}
                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2 bg-white/90 hover:bg-white text-gray-900"
                            onClick={() => handleDownload(notice.image_url, notice.title)}
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </Button>
                    </div>
                </div>
            )}
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-blue-500" />
                            {notice.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary" className={cn("capitalize", audienceColors[notice.audience] || "bg-gray-100 text-gray-800")}>
                                {notice.audience}
                            </Badge>
                            {!notice.is_published && (
                                <Badge variant="outline" className="text-amber-500 border-amber-500">
                                    Draft
                                </Badge>
                            )}
                        </div>
                    </div>
                    {(onEdit || onDelete) && (
                        <div className="flex gap-1">
                            {onEdit && (
                                <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <Edit className="w-4 h-4" />
                                </Button>
                            )}
                            {onDelete && (
                                <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pb-3 text-gray-600 dark:text-gray-300 whitespace-pre-wrap flex-grow">
                {notice.body}
            </CardContent>
            <CardFooter className="pt-3 border-t flex flex-wrap justify-between gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Published: {formatDate(notice.publish_at || notice.created_at)}</span>
                    </div>
                    {notice.expire_at && (
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Expires: {formatDate(notice.expire_at)}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>By: {notice.created_by_name || 'Admin'}</span>
                </div>
            </CardFooter>
        </Card>
    );
}
