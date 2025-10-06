import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getAllProfiles, updateUserProfile } from "../../lib/db/profiles";

export default function AdminProfilesPage() {
    const [profiles, setProfiles] = useState([]);
    const [toast, setToast] = useState(null);
    const [confirmUserId, setConfirmUserId] = useState(null);
    const [confirmUserName, setConfirmUserName] = useState("");

    useEffect(() => {
        async function loadProfiles() {
            try {
                const allProfiles = await getAllProfiles();
                setProfiles(allProfiles);
            } catch (err) {
                showToast("❌ Failed to load profiles: " + err.message, "error");
            }
        }
        loadProfiles();
    }, []);

    function showToast(message, type = "info") {
        setToast({ msg: message, type });
        setTimeout(() => setToast(null), 4000);
    }

    async function handleUpdate(id, updates) {
        try {
            const updated = await updateUserProfile(id, updates);
            setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
            showToast("✅ Profile updated", "success");
        } catch (err) {
            showToast("❌ " + err.message, "error");
        }
    }

    async function handleDelete(targetUserId) {
        try {
            const res = await fetch("/api/deleteUser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Delete failed");

            setProfiles((prev) => prev.filter((p) => p.id !== targetUserId));
            showToast("✅ User deleted successfully", "success");
        } catch (err) {
            showToast("❌ " + err.message, "error");
        }
    }

    return (
        <main className="admin-container">
            <div className="card">
                <h2>Admin: Manage All Profiles</h2>

                {profiles.length === 0 ? (
                    <p>No profiles found.</p>
                ) : (
                    <table className="profiles-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>First</th>
                                <th>Last</th>
                                <th>Company</th>
                                <th>Shift</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profiles.map((profile) => (
                                <tr key={profile.id}>
                                    <td className="uid">{profile.id}</td>
                                    <td>
                                        <input
                                            value={profile.first_name || ""}
                                            onChange={(e) =>
                                                setProfiles((prev) =>
                                                    prev.map((p) =>
                                                        p.id === profile.id
                                                            ? { ...p, first_name: e.target.value }
                                                            : p
                                                    )
                                                )
                                            }
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={profile.last_name || ""}
                                            onChange={(e) =>
                                                setProfiles((prev) =>
                                                    prev.map((p) =>
                                                        p.id === profile.id
                                                            ? { ...p, last_name: e.target.value }
                                                            : p
                                                    )
                                                )
                                            }
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={profile.company_name || ""}
                                            onChange={(e) =>
                                                setProfiles((prev) =>
                                                    prev.map((p) =>
                                                        p.id === profile.id
                                                            ? { ...p, company_name: e.target.value }
                                                            : p
                                                    )
                                                )
                                            }
                                        />
                                    </td>
                                    <td>
                                        <select
                                            value={profile.shift_type || ""}
                                            onChange={(e) =>
                                                setProfiles((prev) =>
                                                    prev.map((p) =>
                                                        p.id === profile.id
                                                            ? { ...p, shift_type: e.target.value }
                                                            : p
                                                    )
                                                )
                                            }
                                        >
                                            <option value="">Select</option>
                                            <option value="morning">Morning</option>
                                            <option value="afternoon">Afternoon</option>
                                            <option value="night">Night</option>
                                        </select>
                                    </td>
                                    <td>
                                        <span
                                            className={`badge ${profile.is_admin ? "admin" : "user"}`}
                                        >
                                            {profile.is_admin ? "Admin ✅" : "User ❌"}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={profile.is_admin || false}
                                            onChange={(e) =>
                                                setProfiles((prev) =>
                                                    prev.map((p) =>
                                                        p.id === profile.id
                                                            ? { ...p, is_admin: e.target.checked }
                                                            : p
                                                    )
                                                )
                                            }
                                        />
                                    </td>
                                    <td>
                                        <button
                                            className="btn"
                                            onClick={() => handleUpdate(profile.id, profile)}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="btn delete"
                                            onClick={() => {
                                                setConfirmUserId(profile.id);
                                                setConfirmUserName(
                                                    `${profile.first_name} ${profile.last_name}`
                                                );
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmUserId && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>⚠️ Confirm Deletion</h3>
                        <p>
                            Are you sure you want to delete{" "}
                            <strong>{confirmUserName}</strong>?<br />
                            This will permanently remove their account, profile, and orders.
                        </p>
                        <div className="modal-buttons">
                            <button
                                className="btn delete"
                                onClick={() => {
                                    handleDelete(confirmUserId);
                                    setConfirmUserId(null);
                                }}
                            >
                                Yes, Delete
                            </button>
                            <button className="btn" onClick={() => setConfirmUserId(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

            <style jsx>{`
        .admin-container {
          padding: 2rem;
          background: #f9fafb;
          min-height: 80vh;
          display: flex;
          justify-content: center;
        }
        .card {
          background: #fff;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 1000px;
        }
        table.profiles-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        table th,
        table td {
          border: 1px solid #ddd;
          padding: 0.6rem;
          text-align: left;
        }
        table th {
          background: #f1f1f1;
        }
        input,
        select {
          width: 100%;
          padding: 0.4rem;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .badge {
          display: inline-block;
          margin-right: 0.5rem;
          padding: 0.3rem 0.6rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .badge.admin {
          background: #e6ffed;
          color: #0c6c2c;
        }
        .badge.user {
          background: #ffe6e6;
          color: #a10000;
        }
        .btn {
          padding: 0.5rem 1rem;
          background: #0070f3;
          color: #fff;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: bold;
          margin-right: 0.5rem;
        }
        .btn:hover {
          background: #005bb5;
        }
        .btn.delete {
          background: #d9534f;
        }
        .btn.delete:hover {
          background: #a94442;
        }
        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        .modal {
          background: #fff;
          padding: 2rem;
          border-radius: 8px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }
        .modal-buttons {
          margin-top: 1.5rem;
          display: flex;
          justify-content: space-around;
        }
        /* Toast */
        .toast {
          position: fixed;
          top: 1rem;
          right: 1rem;
          padding: 1rem;
          border-radius: 5px;
          font-weight: bold;
          z-index: 10000;
        }
        .toast.success {
          background: #e6ffed;
          color: #0c6c2c;
        }
        .toast.error {
          background: #ffe6e6;
          color: #a10000;
        }
        .toast.info {
          background: #e6f0ff;
          color: #004085;
        }
      `}</style>
        </main>
    );
}
