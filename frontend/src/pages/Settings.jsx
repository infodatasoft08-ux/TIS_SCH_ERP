import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThemeAnimation } from '@space-man/react-theme-animation';
import { useLanguage } from '@/context/LanguageContext';
import { Moon, Sun, Globe, User, ShieldCheck, MenuIcon, School, Camera, Image as ImageIcon, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ImageCropUpload from '@/components/ImageCropUpload';
import API from '@/api';
import { toast } from 'sonner';

export default function Settings() {
    const { theme, toggleTheme, ref } = useThemeAnimation();
    const { lang, setLang, t } = useLanguage();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [logo, setLogo] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [schoolName, setSchoolName] = useState("");
    const [admissionPrefix, setAdmissionPrefix] = useState("");
    const [employeePrefix, setEmployeePrefix] = useState("");
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Branding Colors and Font
    const [headerBg, setHeaderBg] = useState("#ffffff");
    const [sidebarBg, setSidebarBg] = useState("#ffffff");
    const [mainBg, setMainBg] = useState("#f8fafc");
    const [appFont, setAppFont] = useState("'Inter', sans-serif");

    const ROLES = {
        ADMIN: 3,
        TEACHER: 2,
        STUDENT: 1,
        PARENT: 5,
        ACCOUNTANT: 4,
        SUPERADMIN: 6
    };

    const fetchBranding = useCallback(async () => {
        setLoadingGallery(true);
        try {
            const [galleryRes, settingsRes] = await Promise.all([
                API.get('/school-gallery'),
                API.get('/school-gallery/settings')
            ]);

            const images = galleryRes.data.images || [];
            const schoolLogo = images.find(img => img.image_type === 'logo');
            const schoolGallery = images.filter(img => img.image_type === 'gallery');

            setLogo(schoolLogo);
            setGallery(schoolGallery);
            setSchoolName(settingsRes.data.settings?.school_name || "");
            setAdmissionPrefix(settingsRes.data.settings?.admission_no_prefix || "");
            setEmployeePrefix(settingsRes.data.settings?.employee_code_prefix || "");

            setHeaderBg(settingsRes.data.settings?.header_bg || "#ffffff");
            setSidebarBg(settingsRes.data.settings?.sidebar_bg || "#ffffff");
            setMainBg(settingsRes.data.settings?.main_bg || "#f8fafc");
            setAppFont(settingsRes.data.settings?.app_font || "'Inter', sans-serif");
        } catch (error) {
            console.error('Fetch Branding Error:', error);
            toast.error("Failed to load school branding");
        } finally {
            setLoadingGallery(false);
        }
    }, [ROLES.ADMIN]);

    useEffect(() => {
        if (user?.role_id === ROLES.ADMIN) {
            fetchBranding();
        }
    }, [user, fetchBranding, ROLES.ADMIN]);

    const handleUpdateSettings = async () => {
        setSavingSettings(true);
        try {
            await API.post('/school-gallery/settings', {
                settings: {
                    school_name: schoolName,
                    admission_no_prefix: admissionPrefix,
                    employee_code_prefix: employeePrefix,
                    header_bg: headerBg,
                    sidebar_bg: sidebarBg,
                    main_bg: mainBg,
                    app_font: appFont
                }
            });
            toast.success("School settings updated successfully");
            // Invalidate sidebar cache
            localStorage.removeItem('sidebar_branding');
            localStorage.removeItem('sidebar_branding_timestamp');
        } catch (error) {
            console.error('Update Settings Error:', error);
            toast.error("Failed to update school settings");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleUpload = async (file, type) => {
        const isLogo = type === 'logo';
        if (isLogo) setUploadingLogo(true);
        else setUploadingGallery(true);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', type);

        try {
            await API.post('/school-gallery/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
            // Invalidate sidebar cache
            localStorage.removeItem('sidebar_branding');
            localStorage.removeItem('sidebar_branding_timestamp');
            fetchBranding();
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error(`Failed to upload ${type}`);
        } finally {
            if (isLogo) setUploadingLogo(false);
            else setUploadingGallery(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this image?")) return;

        try {
            await API.delete(`/school-gallery/${id}`);
            toast.success("Image deleted successfully");
            // Invalidate sidebar cache
            localStorage.removeItem('sidebar_branding');
            localStorage.removeItem('sidebar_branding_timestamp');
            fetchBranding();
        } catch (error) {
            console.error('Delete Error:', error);
            toast.error("Failed to delete image");
        }
    };

    if (authLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
                <p className="text-muted-foreground">Manage your account preferences and application settings.</p>
            </div>

            <div className="grid gap-6">
                {/* Role Menu Assign Section */}
                {(user.role_id === ROLES.ADMIN || user.role_id === ROLES.SUPERADMIN) && (
                    <Card className="overflow-hidden border-muted/60 shadow-md">
                        <CardHeader className="bg-muted/30">
                            <div className="flex items-center gap-2">
                                <MenuIcon className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Menu Assign</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Role Menu Assign</Label>
                                    <p className="text-sm text-muted-foreground">Assign menu to roles.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={() => navigate('/school/setting')}
                                        className="flex items-center gap-2"
                                    >
                                        <MenuIcon className="h-4 w-4" />
                                        Assign Menu
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* School Branding Section (Admin Only) */}
                {(user.role_id === ROLES.ADMIN || user.role_id === ROLES.SUPERADMIN) && (
                    <div className="space-y-6">
                        {/* School Name and Basic Info */}
                        <Card className="overflow-hidden border-muted/60 shadow-md">
                            <CardHeader className="bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <School className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-lg">School Identity</CardTitle>
                                </div>
                                <CardDescription>Update your school's name and slogan.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="school-name">School Name</Label>
                                    <input
                                        id="school-name"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={schoolName}
                                        onChange={(e) => setSchoolName(e.target.value)}
                                        placeholder="Enter school name"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="admission-prefix">Admission No Prefix</Label>
                                        <input
                                            id="admission-prefix"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={admissionPrefix}
                                            onChange={(e) => setAdmissionPrefix(e.target.value)}
                                            placeholder="e.g. ADMS"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="employee-prefix">Employee Code Prefix</Label>
                                        <input
                                            id="employee-prefix"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={employeePrefix}
                                            onChange={(e) => setEmployeePrefix(e.target.value)}
                                            placeholder="e.g. EMP"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={handleUpdateSettings}
                                        disabled={savingSettings}
                                        className="w-full sm:w-auto"
                                    >
                                        {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Save Changes
                                    </Button>
                                </div>

                                <div className="pt-6 border-t border-muted/60">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1 h-4 bg-primary rounded-full"></div>
                                        <h3 className="font-semibold">Dynamic Branding</h3>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="header-bg">Header Background</Label>
                                            <div className="flex gap-2">
                                                <input
                                                    id="header-bg"
                                                    type="color"
                                                    className="w-10 h-10 rounded-md border p-1 cursor-pointer"
                                                    value={headerBg}
                                                    onChange={(e) => setHeaderBg(e.target.value)}
                                                />
                                                <input
                                                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-xs"
                                                    value={headerBg}
                                                    onChange={(e) => setHeaderBg(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sidebar-bg">Sidebar Background</Label>
                                            <div className="flex gap-2">
                                                <input
                                                    id="sidebar-bg"
                                                    type="color"
                                                    className="w-10 h-10 rounded-md border p-1 cursor-pointer"
                                                    value={sidebarBg}
                                                    onChange={(e) => setSidebarBg(e.target.value)}
                                                />
                                                <input
                                                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-xs"
                                                    value={sidebarBg}
                                                    onChange={(e) => setSidebarBg(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="main-bg">Page Background</Label>
                                            <div className="flex gap-2">
                                                <input
                                                    id="main-bg"
                                                    type="color"
                                                    className="w-10 h-10 rounded-md border p-1 cursor-pointer"
                                                    value={mainBg}
                                                    onChange={(e) => setMainBg(e.target.value)}
                                                />
                                                <input
                                                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-xs"
                                                    value={mainBg}
                                                    onChange={(e) => setMainBg(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2 max-w-sm">
                                        <Label htmlFor="app-font">Application Font Family</Label>
                                        <Select value={appFont} onValueChange={setAppFont}>
                                            <SelectTrigger id="app-font">
                                                <SelectValue placeholder="Select Font" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="'Inter', sans-serif">Inter (Modern & Clean)</SelectItem>
                                                <SelectItem value="'Poppins', sans-serif">Poppins (Elegant & Round)</SelectItem>
                                                <SelectItem value="'Roboto', sans-serif">Roboto (Structured)</SelectItem>
                                                <SelectItem value="'Outfit', sans-serif">Outfit (Premium)</SelectItem>
                                                <SelectItem value="'Faculty Glyphic', sans-serif">Faculty Glyphic (Stylized)</SelectItem>
                                                <SelectItem value="'Edu AU VIC WA NT Pre', sans-serif">School Handwriting</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground mt-1">Note: branding colors only apply in Light Theme.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* School Logo */}
                            <Card className="overflow-hidden border-muted/60 shadow-md">
                                <CardHeader className="bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <School className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">School Logo</CardTitle>
                                    </div>
                                    <CardDescription>Official logo appeared on reports and dashboard.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 flex flex-col items-center space-y-4">
                                    <div className="relative group">
                                        <div className="h-32 w-32 rounded-xl border-4 border-primary/10 shadow-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                                            {logo ? (
                                                <img src={logo.image_url} alt="School Logo" className="h-full w-full object-contain" />
                                            ) : (
                                                <School className="h-12 w-12 text-gray-300" />
                                            )}
                                            {uploadingLogo && (
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-full max-w-[200px]">
                                        <ImageCropUpload onCropped={(file) => handleUpload(file, 'logo')} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        Recommended: Square image, max 2MB.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* School Gallery Upload */}
                            <Card className="overflow-hidden border-muted/60 shadow-md">
                                <CardHeader className="bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Add to Gallery</CardTitle>
                                    </div>
                                    <CardDescription>Upload school event and campus photos.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 flex flex-col items-center justify-center h-[240px] space-y-4">
                                    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                                        <ImageIcon className="h-10 w-10 text-primary" />
                                    </div>
                                    <div className="w-full max-w-[200px]">
                                        <ImageCropUpload onCropped={(file) => handleUpload(file, 'gallery')} />
                                    </div>
                                    {uploadingGallery && (
                                        <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Uploading...
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Gallery View Section (Admin Only) */}
                {/* {user.role_id === ROLES.ADMIN && gallery.length > 0 && (
                    <Card className="overflow-hidden border-muted/60 shadow-md">
                        <CardHeader className="bg-muted/30 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">School Gallery</CardTitle>
                            </div>
                            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                                {gallery.length} Images
                            </span>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {gallery.map((img) => (
                                    <div key={img.id} className="group relative aspect-square rounded-lg border overflow-hidden bg-gray-50 shadow-sm transition-all hover:shadow-md">
                                        <img src={img.image_url} alt="Gallery" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8 rounded-full shadow-lg"
                                                onClick={() => handleDelete(img.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )} */}

                {/* Appearance Section */}
                <Card className="overflow-hidden border-muted/60 shadow-md">
                    <CardHeader className="bg-muted/30">
                        <div className="flex items-center gap-2">
                            <Sun className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Appearance</CardTitle>
                        </div>
                        <CardDescription>Customize how the application looks for you.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Dark Mode</Label>
                                <p className="text-sm text-muted-foreground">Toggle between light and dark theme.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Sun className={`h-4 w-4 ${theme === 'light' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                <Switch
                                    ref={ref}
                                    checked={theme === 'dark'}
                                    onCheckedChange={toggleTheme}
                                />
                                <Moon className={`h-4 w-4 ${theme === 'dark' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Localization Section */}
                <Card className="overflow-hidden border-muted/60 shadow-md">
                    <CardHeader className="bg-muted/30">
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Localization</CardTitle>
                        </div>
                        <CardDescription>Set your preferred language for the interface.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('language')}</Label>
                                <p className="text-sm text-muted-foreground">Choose the language you want to use.</p>
                            </div>
                            <Select value={lang} onValueChange={setLang}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Select Language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English (US)</SelectItem>
                                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                                    <SelectItem value="es">Spanish (Español)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Shortcuts */}
                <Card className="overflow-hidden border-muted/60 shadow-md">
                    <CardHeader className="bg-muted/30">
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </div>
                        <CardDescription>Access important account features.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                className="justify-start h-16 gap-3"
                                onClick={() => navigate('/profile')}
                            >
                                <div className="bg-primary/10 p-2 rounded-full">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-sm">Update Profile</p>
                                    <p className="text-xs text-muted-foreground">Change image and details</p>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="justify-start h-16 gap-3"
                                onClick={() => navigate('/profile')}
                            >
                                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-sm">Security</p>
                                    <p className="text-xs text-muted-foreground">Update password</p>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
