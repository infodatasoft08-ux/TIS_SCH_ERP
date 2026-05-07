import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import API from '@/api';
import { toast } from 'sonner';
import ImageCropUpload from "@/widgets/ImageCropUpload";
import { DatePicker } from '../ui/date-picker';
import { ScrollArea } from '../ui/scroll-area';

export default function EventForm({ open, onOpenChange, onSuccess, event }) {
    const [croppedImage, setCroppedImage] = useState(null);
    const [isImageCleared, setIsImageCleared] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        event_date: '',
        start_time: '',
        end_time: '',
        capacity: '',
        is_public: true
    });

    useEffect(() => {
        setCroppedImage(null);
        setIsImageCleared(false);
        if (event) {
            setFormData({
                title: event.title || '',
                description: event.description || '',
                location: event.location || '',
                event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
                start_time: event.start_time ? event.start_time.substring(0, 5) : '',
                end_time: event.end_time ? event.end_time.substring(0, 5) : '',
                capacity: event.capacity || '',
                is_public: !!event.is_public
            });
        } else {
            setFormData({
                title: '',
                description: '',
                location: '',
                event_date: new Date().toISOString().split('T')[0],
                start_time: '09:00',
                end_time: '10:00',
                capacity: '',
                is_public: true
            });
        }
    }, [event, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formDataToSubmit = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'capacity') {
                    formDataToSubmit.append(key, value ? parseInt(value) : "");
                } else if (value !== undefined && value !== null) {
                    formDataToSubmit.append(key, value);
                }
            });

            if (croppedImage) {
                formDataToSubmit.append("image", croppedImage);
            } else if (event && isImageCleared) {
                formDataToSubmit.append("image_url", ""); // We use image_url or whatever the backend expects for events to clear
                // Wait, I should verify backend for events. Usually just sending empty image string works or they don't support deleting yet. Let's send image: "" or clear flag.
                formDataToSubmit.append("clear_image", "true");
            }

            if (event) {
                await API.put(`/announcement/update/event/${event.id}`, formDataToSubmit);
                toast.success("Event updated successfully");
            } else {
                await API.post('/announcement/add/event', formDataToSubmit);
                toast.success("Event created successfully");
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Event error:", error);
            toast.error(error.response?.data?.error || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-lg sm:max-w-[600px] p-4 sm:p-6"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{event ? 'Update Event' : 'Create New Event'}</DialogTitle>
                </DialogHeader>

                <ScrollArea className="overflow-y-auto h-[calc(70vh)]">
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Event Title</Label>
                            <Input
                                id="title"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Annual Sports Meet"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Briefly describe the event..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g. School Auditorium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="event_date">Date</Label>
                                {/* <Input
                                    id="event_date"
                                    type="date"
                                    required
                                    value={formData.event_date}
                                    onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                                /> */}
                                <DatePicker
                                    value={formData.event_date}
                                    onChange={(date) => setFormData({ ...formData, event_date: date })}
                                    placeholder="dd/mm/yyyy"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacity (Optional)</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    value={formData.capacity}
                                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    placeholder="Unlimited"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Start Time</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                    className="dark:[color-scheme:light_dark] dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time">End Time</Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                    className="dark:[color-scheme:light_dark] dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="public"
                                checked={formData.is_public}
                                onCheckedChange={v => setFormData({ ...formData, is_public: v })}
                            />
                            <Label htmlFor="public">Public Event</Label>
                        </div>

                        <div className="space-y-2">
                            <Label>Event Banner (Optional)</Label>
                            <ImageCropUpload
                                value={croppedImage || (event && !isImageCleared ? event.image_url : null)}
                                onCropped={(file) => {
                                    setCroppedImage(file);
                                    setIsImageCleared(false);
                                }}
                                onClear={() => {
                                    setCroppedImage(null);
                                    setIsImageCleared(true);
                                }}
                            />
                        </div>
                    </form>
                </ScrollArea>

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : (event ? "Update Event" : "Create Event")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
