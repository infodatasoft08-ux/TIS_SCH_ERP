import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
    en: {
        welcome: "Welcome",
        profile: "Profile",
        settings: "Settings",
        logout: "Logout",
        theme: "Theme",
        dark: "Dark",
        light: "Light",
        language: "Language",
        notifications: "Notifications",
        update_profile: "Update Profile",
        change_password: "Change Password",
        full_name: "Full Name",
        email: "Email Address",
        save_changes: "Save Changes",
        today_notifications: "Today's Notifications",
        just_now: "Just now",
        announcement: "Announcement",
        event: "Event",
        view_all_announcements: "View All Announcements"

    },
    hi: {
        welcome: "स्वागत है",
        profile: "प्रोफ़ाइल",
        settings: "सेटिंग्स",
        logout: "लॉगआउट",
        theme: "थीम",
        dark: "डार्क",
        light: "लाइट",
        language: "भाषा",
        notifications: "सूचनाएं",
        update_profile: "प्रोफ़ाइल अपडेट करें",
        change_password: "पासवर्ड बदलें",
        full_name: "पूरा नाम",
        email: "ईमेल पता",
        save_changes: "बदलाव सहेजें",
        today_notifications: "आज की सूचनाएं",
        contact_administration: "प्रशासन से संपर्क करें",
        developed_by: "द्वारा विकसित",
        infodatasoft_pvt_ltd: "INFODATASOFT Pvt. Ltd.",
        login: "लॉगिन",
        sign_in: "साइन इन",
        sign_up: "साइन अप",
        forgot_password: "पासवर्ड भूल गए",
        remember_me: "मुझे याद रखें",
        email_address: "ईमेल पता",
        password: "पासवर्ड",
        sign_in_with_google: "Google के साथ साइन इन करें",
        or: "या",
        don_t_have_an_account: "खाता नहीं है?",
    },
    es: {
        welcome: "Bienvenido",
        profile: "Perfil",
        settings: "Ajustes",
        logout: "Cerrar sesión",
        theme: "Tema",
        dark: "Oscuro",
        light: "Claro",
        language: "Idioma",
        notifications: "Notificaciones",
        update_profile: "Actualizar perfil",
        change_password: "Cambiar contraseña",
        full_name: "Nombre completo",
        email: "Correo electrónico",
        save_changes: "Guardar cambios",
        today_notifications: "Notificaciones de hoy",
        contact_administration: "Contactar administración",
        developed_by: "Desarrollado por",
        infodatasoft_pvt_ltd: "INFODATASOFT Pvt. Ltd.",
        login: "Iniciar sesión",
        sign_in: "Iniciar sesión",
        sign_up: "Registrarse",
        forgot_password: "Olvidar contraseña",
        remember_me: "Recordarme",
        email_address: "Correo electrónico",
        password: "Contraseña",
        sign_in_with_google: "Iniciar sesión con Google",
        or: "o",
        don_t_have_an_account: "¿No tienes una cuenta?",
    }

};

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');

    useEffect(() => {
        localStorage.setItem('app_lang', lang);
    }, [lang]);

    const t = (key) => {
        return translations[lang][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
