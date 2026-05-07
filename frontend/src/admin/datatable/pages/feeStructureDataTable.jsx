import React from 'react';
import { Link } from 'react-router-dom';

export default function FeeStructureDatable() {
    const from = location.state?.from?.pathname || '/school/fee/add';
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Students</h2>
        {/* navigate(from, { replace: true }); */}
        <Link to={from} className="px-3 py-2 bg-green-600 text-white rounded">Add Fee Structure</Link>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-3">Roll</th>
              <th className="p-3">Name</th>
              <th className="p-3">Class</th>
              <th className="p-3">Section</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Replace with mapped rows */}
            <tr className="border-t">
              <td className="p-3">001</td>
              <td className="p-3">John Doe</td>
              <td className="p-3">10</td>
              <td className="p-3">A</td>
              <td className="p-3">
                <button className="px-2 py-1 text-sm rounded bg-blue-50 text-blue-600 mr-2">Edit</button>
                <button className="px-2 py-1 text-sm rounded bg-red-50 text-red-600">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}