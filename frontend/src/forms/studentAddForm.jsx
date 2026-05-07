import React, { useEffect, useState } from 'react';
import API from '../api';

export default function AddStudents() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({first_name:'', last_name:'', roll_no:'', dob:'', class:'', section:'', parent_contact:''});
  const [err,setErr] = useState('');

//   const fetchStudents = async () => {
//     try {
//       const { data } = await API.get('/students');
//       setStudents(data);
//     } catch (e) {
//       setErr('Could not fetch students (are you logged in?)');
//     }
//   };

  useEffect(() => { fetchStudents(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/students', form);
      setStudents(prev => [data, ...prev]);
      setForm({first_name:'', last_name:'', roll_no:'', dob:'', class:'', section:'', parent_contact:''});
    } catch (err) {
      setErr(err?.response?.data?.message || 'Add failed');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-white p-4 rounded shadow">
        <h3 className="font-semibold">Add Student</h3>
        {err && <div className="text-red-600">{err}</div>}
        <form onSubmit={handleAdd} className="space-y-2 mt-2">
          <input placeholder="First name" value={form.first_name} onChange={e=>setForm({...form, first_name:e.target.value})} className="w-full p-2 border rounded" />
          <input placeholder="Last name" value={form.last_name} onChange={e=>setForm({...form, last_name:e.target.value})} className="w-full p-2 border rounded" />
          <input placeholder="Roll no" value={form.roll_no} onChange={e=>setForm({...form, roll_no:e.target.value})} className="w-full p-2 border rounded" />
          <input type="date" value={form.dob} onChange={e=>setForm({...form, dob:e.target.value})} className="w-full p-2 border rounded" />
          <input placeholder="Class" value={form.class} onChange={e=>setForm({...form, class:e.target.value})} className="w-full p-2 border rounded" />
          <input placeholder="Section" value={form.section} onChange={e=>setForm({...form, section:e.target.value})} className="w-full p-2 border rounded" />
          <input placeholder="Parent contact" value={form.parent_contact} onChange={e=>setForm({...form, parent_contact:e.target.value})} className="w-full p-2 border rounded" />
          <button className="w-full bg-green-600 text-white p-2 rounded">Add</button>
        </form>
      </div>
    </div>
  );
}