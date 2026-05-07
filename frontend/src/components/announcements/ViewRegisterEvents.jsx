import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import API from '@/api';
import { toast } from 'sonner';

export default function ViewRegisterEvents({ open, onOpenChange, eventId }) {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open && eventId) {
            fetchRegistrations();
        }
    }, [open, eventId]);

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/announcement/list/events/${eventId}/registrations`);
            setRegistrations(res.data.registrations || []);
        } catch (error) {
            console.error("Error fetching registrations:", error);
            toast.error("Failed to load registrations");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Event Registrations</DialogTitle>
                    <DialogDescription>
                        List of users registered for this event.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : registrations.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Roll No</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Registered At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.map((reg) => (
                                <TableRow key={reg.id}>
                                    <TableCell className="font-medium">{reg.user_name}</TableCell>
                                    <TableCell>{reg.user_email}</TableCell>
                                    <TableCell>{reg.roll_no || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            reg.status === 'registered' ? 'default' :
                                                reg.status === 'checked_in' ? 'success' : 'destructive'
                                        }>
                                            {reg.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(reg.registered_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No registrations found for this event.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
