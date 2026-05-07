import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Users, CheckCircle, AlertCircle, Edit, List, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EventCard({ event, onRegister, userRegistration, loading, className, countRegistrations, onEdit, onViewRegistrations, onDelete }) {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isFull = event.capacity && event.registered_count >= event.capacity;
    const isRegistered = userRegistration?.status === 'registered';
    const isCancelled = userRegistration?.status === 'cancelled';
    const isCheckedIn = userRegistration?.status === 'checked_in';

    // Check if event is passed
    const now = new Date();
    const eventDate = new Date(event.event_date);
    const isPassed = eventDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Compare dates only first

    // Detailed time check if same day (optional)
    let isPassedDetailed = isPassed;
    if (!isPassed && event.event_date === now.toISOString().split('T')[0] && event.end_time) {
        const [hours, minutes] = event.end_time.split(':');
        const endTimeDate = new Date(eventDate);
        endTimeDate.setHours(parseInt(hours), parseInt(minutes));
        if (now > endTimeDate) {
            isPassedDetailed = true;
        }
    }

    return (
        <Card className={cn("overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full", className)}>
            {event.image_url && (
                <div className="h-48 overflow-hidden bg-gray-100 relative group">
                    <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            )}
            {!event.image_url && <div className="h-2 bg-blue-500" />}
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-xl font-bold leading-tight">
                        {event.title}
                    </CardTitle>
                    <div className="flex flex-col items-end gap-1">
                        {event.is_public ? (
                            <Badge variant="outline" className="text-blue-500 border-blue-500 text-[10px] uppercase font-bold px-1.5 py-0">Public</Badge>
                        ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-500 text-[10px] uppercase font-bold px-1.5 py-0">Private</Badge>
                        )}
                        {isRegistered && <Badge className="bg-green-500 hover:bg-green-600">Registered</Badge>}
                        {isCheckedIn && <Badge className="bg-blue-500 hover:bg-blue-600">Checked In</Badge>}
                        {isCancelled && <Badge className="bg-red-500 hover:bg-red-600">Cancelled</Badge>}
                        {isPassedDetailed && <Badge variant="secondary" className="bg-gray-200 text-gray-600">Ended</Badge>}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-grow space-y-4 pb-3">
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>{formatDate(event.event_date)}</span>
                    </div>
                    {(event.start_time || event.end_time) && (
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>
                                {event.start_time?.substring(0, 5) || '--:--'}
                                {event.end_time ? ` - ${event.end_time.substring(0, 5)}` : ''}
                            </span>
                        </div>
                    )}
                    {event.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="truncate">{event.location}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>
                            {countRegistrations || 0} / {event.capacity || '∞'}
                            <span className="text-xs text-gray-400 ml-1">registered</span>
                        </span>
                    </div>
                </div>

                {event.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 italic">
                        "{event.description}"
                    </p>
                )}
            </CardContent>

            <CardFooter className="pt-3 border-t bg-gray-50 dark:bg-gray-900/40 flex flex-col gap-2">
                {onRegister && (
                    <Button
                        className="w-full font-bold"
                        variant={isRegistered ? "outline" : "default"}
                        disabled={loading || (isFull && !isRegistered) || isCheckedIn || isPassedDetailed}
                        onClick={() => onRegister(event.id)}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                        ) : isRegistered ? (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Change Status
                            </>
                        ) : isPassedDetailed ? (
                            "Event Ended"
                        ) : isFull ? (
                            <>
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Waitlist / Full
                            </>
                        ) : (
                            "Register Now"
                        )}
                    </Button>
                )}

                {(onEdit || onViewRegistrations || onDelete) && (
                    <div className="flex gap-2 w-full">
                        {onEdit && (
                            <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                        )}
                        {onViewRegistrations && (
                            <Button variant="outline" size="sm" onClick={onViewRegistrations} className="flex-1">
                                <List className="w-4 h-4 mr-2" />
                                Registrations
                            </Button>
                        )}
                        {onDelete && (
                            <Button variant="destructive" size="icon" onClick={onDelete} className="shrink-0 bg-red-500 hover:bg-red-600 text-white">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
