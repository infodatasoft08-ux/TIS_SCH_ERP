import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import API from '@/api';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';
import ImageCropUpload from "@/widgets/ImageCropUpload";

export default function NoticeForm({ open, onOpenChange, onSuccess, notice }) {
    const [croppedImage, setCroppedImage] = useState(null);
    const [isImageCleared, setIsImageCleared] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        audience: 'all',
        publish_at: '',
        expire_at: '',
        is_published: true
    });

    useEffect(() => {
        setCroppedImage(null);
        setIsImageCleared(false);
        if (notice) {
            setFormData({
                title: notice.title || '',
                body: notice.body || '',
                audience: notice.audience || 'all',
                publish_at: notice.publish_at || '',
                expire_at: notice.expire_at || '',
                is_published: !!notice.is_published
            });
        } else {
            setFormData({
                title: '',
                body: '',
                audience: 'all',
                publish_at: new Date().toISOString().slice(0, 16),
                expire_at: '',
                is_published: true
            });
        }
    }, [notice, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formDataToSubmit = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formDataToSubmit.append(key, value);
                }
            });

            if (croppedImage) {
                // Validation for 2MB
                if (croppedImage.size > 2 * 1024 * 1024) {
                    toast.error("Image size must be less than 2MB");
                    setLoading(false);
                    return;
                }
                formDataToSubmit.append("image", croppedImage);
            } else if (notice && isImageCleared) {
                formDataToSubmit.append("image_url", ""); // Clear image
            }

            if (notice) {
                await API.put(`/announcement/update/notice/${notice.id}`, formDataToSubmit);
                toast.success("Notice updated successfully");
            } else {
                await API.post('/announcement/add/notice', formDataToSubmit);
                toast.success("Notice created successfully");
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Notice error:", error);
            toast.error(error.response?.data?.error || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{notice ? 'Update Notice' : 'Create New Notice'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="overflow-y-auto h-[calc(50vh)]">
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Notice title"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="body">Body</Label>
                            <Textarea
                                id="body"
                                required
                                rows={4}
                                value={formData.body}
                                onChange={e => setFormData({ ...formData, body: e.target.value })}
                                placeholder="Write the notice content here..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Audience</Label>
                                <Select
                                    value={formData.audience}
                                    onValueChange={v => setFormData({ ...formData, audience: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select audience" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="students">Students</SelectItem>
                                        <SelectItem value="teachers">Teachers</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="parents">Parents</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2 pt-8">
                                <Switch
                                    id="published"
                                    checked={formData.is_published}
                                    onCheckedChange={v => setFormData({ ...formData, is_published: v })}
                                />
                                <Label htmlFor="published">Published</Label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="publish_at">Publish At</Label>
                                <Input
                                    id="publish_at"
                                    type="datetime-local"
                                    value={formData.publish_at}
                                    onChange={e => setFormData({ ...formData, publish_at: e.target.value })}
                                    className="dark:[color-scheme:light_dark] dark:bg-gray-800 dark:text-white "
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expire_at">Expire At (Optional)</Label>
                                <Input
                                    id="expire_at"
                                    type="datetime-local"
                                    value={formData.expire_at}
                                    onChange={e => setFormData({ ...formData, expire_at: e.target.value })}
                                    className="dark:[color-scheme:light_dark] dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notice Image (Optional, Max 2MB)</Label>
                            <ImageCropUpload
                                value={croppedImage || (notice && !isImageCleared ? notice.image_url : null)}
                                onCropped={(file) => {
                                    if (file.size > 2 * 1024 * 1024) {
                                        toast.error("Selected image is too large (max 2MB)");
                                        return;
                                    }
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
                        {loading ? "Saving..." : (notice ? "Update Notice" : "Create Notice")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
