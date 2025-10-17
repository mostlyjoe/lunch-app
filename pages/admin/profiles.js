import { useEffect, useState } from "react";
import { getAllProfiles } from "../../lib/db/profiles";

export default function AdminProfilesPage() {
    const [profiles, setProfiles] = useState([]);
    const [toast, setToast] = useState(null);

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

    // Group and sort profiles by shift (sorted by last name, then first name)
    const groupAndSortProfiles = (profiles) => {
        const groups = {
            morning: [],
            afternoon: [],
            night: [],
            unassigned: [],
        };

        profiles.forEach((p) => {
            const shift = p.shift_type || "unassigned";
            if (groups[shift]) groups[shift].push(p);
        });

        // Sort each group alphabetically by last name, then first name
        Object.keys(groups).forEach((key) => {
            groups[key].sort((a, b) => {
                const lastA = (a.last_name || "").toLowerCase();
                const lastB = (b.last_name || "").toLowerCase();
                const firstA = (a.first_name || "").toLowerCase();
                const firstB = (b.first_name || "").toLowerCase();

                if (lastA < lastB) return -1;
                if (lastA > lastB) return 1;
                if (firstA < firstB) return -1;
                if (firstA > firstB) return 1;
                return 0;
            });
        });

        return groups;
    };

    const grouped = groupAndSortProfiles(profiles);

    return (
        <main className="admin-container">
            <div className="card">
                <h2>Admin: All User Profiles (Read Only)</h2>

                {profiles.length === 0 ? (
                    <p>No profiles found.</p>
                ) : (
                    Object.entries(grouped).map(([shift, users]) => (
                        <div key={shift} className="shift-section">
                            <h3 className="shift-header">
                                {shift === "unassigned"
                                    ? "Unassigned Shift"
                                    : shift.charAt(0).toUpperCase() + shift.slice(1)}{" "}
                                ({users.length})
                            </h3>

                            {users.length === 0 ? (
                                <p>No users in this shift.</p>
                            ) : (
                                <table className="profiles-table">
                                    <thead>
                                        <tr>
                                            <th>First Name</th>
                                            <th>Last Name</th>
                                            <th>Company</th>
                                            <th>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((profile) => (
                                            <tr
                                                key={profile.id}
                                                className={
                                                    profile.is_admin ? "admin-row" : ""
                                                }
                                            >
                                                <td>{profile.first_name || "-"}</td>
                                                <td>{profile.last_name || "-"}</td>
                                                <td>{profile.company_name || "-"}</td>
                                                <td>
                                                    <span
                                                        className={`badge ${
                                                            profile.is_admin ? "admin" : "user"
                                                        }`}
                                                    >
                                                        {profile.is_admin
                                                            ? "Admin ✅"
                                                            : "User"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))
                )}
            </div>

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
                .shift-section {
                    margin-bottom: 2rem;
                }
                .shift-header {
                    background: #e8f4ff;
                    padding: 0.6rem 1rem;
                    border-left: 4px solid #0070f3;
                    border-radius: 4px;
                    font-size: 1.1rem;
                    margin-bottom: 0.5rem;
                }
                table.profiles-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 0.5rem;
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
                .admin-row {
                    outline: 2px solid #2196f3;
                    outline-offset: -3px;
                    background: #f0f8ff;
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
