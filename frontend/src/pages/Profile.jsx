import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/auth/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Camera, Save, Key, User as UserIcon, Mail, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ImageCropUpload from '@/components/ImageCropUpload';
import API from '@/api';
import { Textarea } from '@/components/ui/textarea';

export default function Profile() {
    const { user, setUser, logout } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        date_of_birth: user.student_date?.date_of_birth ? new Date(user.student_date.date_of_birth).toISOString().split('T')[0] : "",
        blood_group: user.student_date?.blood_group || "",
        adhar_number: user.student_date?.adhar_number || user?.user_adhar_no || "",
        address: user.student_date?.address || user?.user_address || "",
        fathers_name: user.student_date?.fathers_name || "",
        mothers_name: user.student_date?.mothers_name || "",
        parent_contact: user.student_date?.parent_contact || "",
        mother_contect: user.student_date?.mother_contect || "",
        father_occupation: user.student_date?.father_occupation || "",
    });

    const [passData, setPassData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [croppedImage, setCroppedImage] = useState(null);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const data = new FormData();
            data.append('name', formData.name || "");
            data.append('email', formData.email || "");
            data.append('phone', formData.phone || "");

            if (user?.role_id === 1) {
                let dobFormatted = formData.date_of_birth;
                if (dobFormatted) {
                    try {
                        const d = new Date(dobFormatted);
                        if (!isNaN(d)) {
                            dobFormatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        }
                    } catch (e) { }
                }
                data.append('date_of_birth', dobFormatted || "");
                data.append('blood_group', formData.blood_group || "");
                data.append('adhar_number', formData.adhar_number || "");
                data.append('address', formData.address || "");
                data.append('fathers_name', formData.fathers_name || "");
                data.append('mothers_name', formData.mothers_name || "");
                data.append('parent_contact', formData.parent_contact || "");
                data.append('mother_contect', formData.mother_contect || "");
                data.append('father_occupation', formData.father_occupation || "");
            }

            if (croppedImage) {
                data.append('image', croppedImage);
            }

            // Role based endpoint determination
            let endpoint = '';
            if (user.role_id === 1) endpoint = `/students/update/student/${user.student_id || user.id}`;
            else if (user.role_id === 2) endpoint = `/teachers/update/teacher/${user.id}`;
            else if (user.role_id === 4) endpoint = `/staffUser/update/staff/${user.id}`;
            else if (user.role_id === 3) endpoint = `/admin/update/admin/${user.id}`;
            else if (user.role_id === 6) endpoint = `/superadmin/update/superadmin/${user.id}`;
            else {
                endpoint = `/students/update/student/${user.id}`; // Fallback
            }

            const res = await API.put(endpoint, data);

            // Update local storage and context
            const updatedUser = { ...user, ...res.data.user };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));

            toast.success('Profile updated successfully');
            setCroppedImage(null);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passData.newPassword !== passData.confirmPassword) {
            return toast.error("Passwords don't match");
        }

        try {
            setPasswordLoading(true);

            let endpoint = '';
            if (user.role_id === 1) endpoint = `/students/update/student/${user.student_id || user.id}/password`;
            else if (user.role_id === 2) endpoint = `/teachers/update/teacher/${user.id}/password`;
            else if (user.role_id === 4) endpoint = `/staffUser/update/staff/${user.id}/password`;
            else if (user.role_id === 3) endpoint = `/admin/update/admin/${user.id}/password`;
            else if (user.role_id === 6) endpoint = `/superadmin/update/superadmin/${user.id}/password`;
            else {
                // For staff/admin use forgotPassword logic or generic update
                endpoint = `/auth/forgot/password`;
            }

            await API.put(endpoint, {
                email: user.email,
                current_password: passData.currentPassword,
                new_password: passData.newPassword
            });

            toast.success('Password updated successfully');
            setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            logout();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const userImage = user?.avatar_url || user?.user_avatar_url || "https://github.com/shadcn.png";
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US';

    const toggleShowPassword = () => setShowPassword(!showPassword);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{t('profile')}</h1>
                <p className="text-muted-foreground">Manage your personal information and security settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Avatar */}
                <div className="space-y-6">
                    <Card className="border-muted/60 shadow-md transition-all hover:shadow-lg">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-lg">Avatar</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center space-y-4 pb-6">
                            <div className="relative group">
                                <Avatar className="h-32 w-32 border-4 border-primary/10 shadow-xl pointer-events-none">
                                    <AvatarImage src={croppedImage ? URL.createObjectURL(croppedImage) : userImage} className="object-cover" />
                                    <AvatarFallback className="text-2xl bg-primary text-white">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="text-white h-8 w-8" />
                                </div>
                            </div>

                            <div className="w-full">
                                <ImageCropUpload onCropped={(file) => setCroppedImage(file)} />
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center">
                                JPG, PNG or GIF. Max size 2MB.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Forms */}
                <div className="md:col-span-2 space-y-8">
                    {/* General Info */}
                    <Card className="border-muted/60 shadow-md">
                        <CardHeader className="bg-muted/30">
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Personal Information</CardTitle>
                            </div>
                            <CardDescription>Update your basic profile details.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">{t('full_name')}</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">{t('email')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">{t('phone')}</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="1234567890"
                                        required
                                    />
                                </div>

                                {user?.role_id === 1 && (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="date_of_birth">Date of Birth</Label>
                                                <Input
                                                    id="date_of_birth"
                                                    type="date"
                                                    value={formData.date_of_birth}
                                                    onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="blood_group">Blood Group</Label>
                                                <Input
                                                    id="blood_group"
                                                    value={formData.blood_group}
                                                    onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                                                    placeholder="A+"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="adhar_number">Adhar Number</Label>
                                                <Input
                                                    id="adhar_number"
                                                    value={formData.adhar_number}
                                                    onChange={e => setFormData({ ...formData, adhar_number: e.target.value })}
                                                    placeholder="12 Digit Adhar Number"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="address">Address</Label>
                                                <Textarea
                                                    id="address"
                                                    value={formData.address}
                                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                    placeholder="Your address"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 mt-2 border-t border-muted/60">
                                            <h4 className="text-sm font-semibold mb-4 text-primary">Parent Information</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="fathers_name">Father's Name</Label>
                                                    <Input
                                                        id="fathers_name"
                                                        value={formData.fathers_name}
                                                        onChange={e => setFormData({ ...formData, fathers_name: e.target.value })}
                                                        placeholder="Father's name"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="mothers_name">Mother's Name</Label>
                                                    <Input
                                                        id="mothers_name"
                                                        value={formData.mothers_name}
                                                        onChange={e => setFormData({ ...formData, mothers_name: e.target.value })}
                                                        placeholder="Mother's name"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="parent_contact">Father Contact</Label>
                                                    <Input
                                                        id="parent_contact"
                                                        value={formData.parent_contact}
                                                        onChange={e => setFormData({ ...formData, parent_contact: e.target.value })}
                                                        placeholder="Father's contact number"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="mother_contect">Mother Contact</Label>
                                                    <Input
                                                        id="mother_contect"
                                                        value={formData.mother_contect}
                                                        onChange={e => setFormData({ ...formData, mother_contect: e.target.value })}
                                                        placeholder="Mother's contact number"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="father_occupation">Father Occupation</Label>
                                                    <Input
                                                        id="father_occupation"
                                                        value={formData.father_occupation}
                                                        onChange={e => setFormData({ ...formData, father_occupation: e.target.value })}
                                                        placeholder="Father's occupation"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <Button type="submit" className="w-full sm:w-auto gap-2 mt-4" disabled={loading}>
                                    {loading ? 'Saving...' : <><Save className="h-4 w-4" /> Save Changes</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card className="border-muted/60 shadow-md">
                        <CardHeader className="bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">{t('change_password')}</CardTitle>
                            </div>
                            <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div className="grid gap-2 relative">
                                    <Label htmlFor="current">Current Password</Label>
                                    <Input
                                        id="current"
                                        type={showPassword ? "text" : "password"}
                                        value={passData.currentPassword}
                                        onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                                        required

                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleShowPassword}
                                        className='absolute right-1 top-3 h-full hover:bg-transparent'
                                    >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2 relative">
                                        <Label htmlFor="new">New Password</Label>
                                        <Input
                                            id="new"
                                            type={showPassword ? "text" : "password"}
                                            value={passData.newPassword}
                                            onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={toggleShowPassword}
                                            className='absolute right-1 top-3 h-full hover:bg-transparent'
                                        >
                                            {showPassword ? <EyeOff /> : <Eye />}
                                        </Button>
                                    </div>
                                    <div className="grid gap-2 relative">
                                        <Label htmlFor="confirm">Confirm Password</Label>
                                        <Input
                                            id="confirm"
                                            type={showPassword ? "text" : "password"}
                                            value={passData.confirmPassword}
                                            onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={toggleShowPassword}
                                            className='absolute right-1 top-3 h-full hover:bg-transparent'
                                        >
                                            {showPassword ? <EyeOff /> : <Eye />}
                                        </Button>
                                    </div>
                                </div>
                                <Button type="submit" variant="secondary" className="w-full sm:w-auto gap-2" disabled={passwordLoading}>
                                    {passwordLoading ? 'Updating...' : <><Key className="h-4 w-4" /> Update Password</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
