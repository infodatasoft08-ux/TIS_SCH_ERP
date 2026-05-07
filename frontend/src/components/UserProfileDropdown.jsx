import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function UserProfileDropdown({ onLogout }) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Handle image and fallback
    const userImage = user?.avatar_url || user?.user_avatar_url || "https://github.com/shadcn.png";
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="focus:outline-none focus-visible:ring-2 ring-primary rounded-full transition-transform hover:scale-105 active:scale-95">
                    <Avatar className="h-12 w-12 border-2 border-primary/20 bg-muted shadow-sm">
                        <AvatarImage src={userImage} alt={user?.name} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white font-medium">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={10}>
                <DropdownMenuLabel className="font-normal border-b pb-3 mb-1">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none truncate">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuItem onClick={() => navigate('/school/profile')} className="cursor-pointer py-2.5">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t('profile')}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/school/settings')} className="cursor-pointer py-2.5">
                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t('settings')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={onLogout} className="cursor-pointer py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('logout')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
