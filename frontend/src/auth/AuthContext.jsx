import React, { createContext, useContext, useEffect, useState } from 'react';
import API from '../api';
import PropTypes from 'prop-types';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  // const [studentData, setStudentData] = useState(() => {
  //   try {
  //     const raw = localStorage.getItem('studentData');
  //     return raw ? JSON.parse(raw) : null;
  //   } catch(e) {
  //     return null;
  //   }
  // });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      API.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete API.defaults.headers.common.Authorization;
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  // useEffect(() => {
  //   if (studentData) localStorage.setItem('studentData', JSON.stringify(studentData));
  //   else localStorage.removeItem('studentData');
  // }, [studentData]);

  // const fetchStudentData = async () => {
  //   try {
  //     const res = await API.get('/students/get/student_id');
  //     const studentInfo = res.data.student || res.data; // Adjust based on your API response
  //     setStudentData(studentInfo);
  //     return studentInfo;
  //   } catch (err) {
  //     console.error('Failed to fetch student data:', err);
  //     return null;
  //   }
  // };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await API.post('/auth/login', { email, password });
      const { token: token, user: user } = res.data;
      setToken(token);
      setUser(user);
      setLoading(false);
      // Wait for the token to be set in API headers (useEffect runs after render)
      // setTimeout(async () => {
      //   if (user.role_id === 1) {
      //   await fetchStudentData();
      // }
      // setLoading(false);
      // }, 100);

      return { ok: true, user: user };
    } catch (err) {
      setLoading(false);
      const message = err?.response?.data?.message || err.message || 'Login failed';
      return { ok: false, message };
    }
  };

  const googleLogin = async (email) => {
    setLoading(true);
    try {
      const res = await API.post('/auth/google-login', { email });
      const { token: newtoken, user: newuser } = res.data;
      setToken(newtoken);
      setUser(newuser);
      setLoading(false);
      return { ok: true, user: newuser };
    } catch (err) {
      setLoading(false);
      const message = err?.response?.data?.message || err.message || 'Google Login failed';
      return { ok: false, message };
    }
  };

  const forgotPassword = async (email,  currentPassword, newPassword) => {
    setLoading(true);
    try {
      const res = await API.post('/auth/forgot/password', { email, currentPassword, newPassword });
      setLoading(false);
      return { ok: true, user: user };
    } catch (err) {
      setLoading(false);
      const message = err?.response?.data?.message || err.message || 'forgot password failed';
      return { ok: false, message };
    }
  }

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Function to manually refresh student data
  // const refreshStudentData = async () => {
  //   if (user?.role === 'student') {
  //     return await fetchStudentData();
  //   }
  //   return null;
  // };


  return (
    <AuthContext.Provider value={{ user, token, loading, login, googleLogin, logout, forgotPassword, setToken, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = { children: PropTypes.node };

export function useAuth() {
  return useContext(AuthContext);
}