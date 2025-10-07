// pages/profile/index.js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getProfile, updateProfile } from "../../lib/db/profiles";
import toast from "react-hot-toast";

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [showNotice, setShowNotice] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            const { data } = await supabase.auth.getUser();
            if (!data?.user) {
                window.location.href = "/login";
                return;
            }

            try {
                const p = await getProfile(data.user.id);
                if (!p) {
                    toast.error("❌ No profile found. Please complete signup.");
                } else {
                    setProfile(p);
                }
            } catch (err) {
                toast.error("Failed to load profile: " + err.message);
            }
        }
        loadProfile();
    }, []);

    function handleShiftChange(e) {
        const newShift = e.target.value;
        if (profile?.shift_type && newShift !== profile.shift_type) {
            setShowNotice(true);
            setTimeout(() => setShowNotice(false), 3000);
        }
        setProfile({ ...profile, shift_type: newShift });
    }

    async function confirmSave() {
        setShowConfirm(false);
        try {
            await updateProfile(profile.id, {
                first_name: profile.first_name,
                last_name: profile.last_name,
                shift_type: profile.shift_type,
            });
            toast.success("✅ Profile updated successfully!");
        } catch (err) {
            toast.error("❌ Failed to update profile.");
        }
    }

    function handleSave(e) {
        e.preventDefault();
        setShowConfirm(true);
    }

    if (!profile) {
        return (
            <main className="profile-container">
                <h2>My Profile</h2>
                <p>Loading profile...</p>
                <style jsx>{`
                    .profile-container { padding: 2rem; text-align: center; }
                `}</style>
            </main>
        );
    }

    return (
        <main className="profile-container">
            <div className="card">
                <h2>My Profile</h2>

                <form onSubmit={handleSave} className="form">
                    <label>
                        First Name
                        <input
                            type="text"
                            value={profile.first_name || ""}
                            onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                            required
                        />
                    </label>

                    <label>
                        Last Name
                        <input
                            type="text"
                            value={profile.last_name || ""}
                            onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                            required
                        />
                    </label>

                    <label>
                        Shift
                        <select
                            value={profile.shift_type || ""}
                            onChange={handleShiftChange}
                            required
                        >
                            <option value="">Select Shift</option>
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="night">Night</option>
                        </select>
                    </label>

                    {showNotice && (
                        <div className={`shift-notice ${showNotice ? "show" : "hide"}`}>
                            💡 Any active orders will appear under your <strong>current shift</strong> for the kitchen.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!profile.first_name || !profile.last_name || !profile.shift_type}
                    >
                        Save Changes
                    </button>
                </form>
            </div>

            {showConfirm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Confirm Changes</h3>
                        <p>Are you sure you want to update your profile and shift?</p>
                        <div className="modal-buttons">
                            <button className="confirm" onClick={confirmSave}>Yes, Save</button>
                            <button className="cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .profile-container {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    padding: 2rem;
                    background: #f9fafb;
                    min-height: 80vh;
                }
                .card {
                    background: #fff;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    width: 100%;
                    max-width: 450px;
                }
                h2 {
                    margin-bottom: 1rem;
                    text-align: center;
                    color: #333;
                }

                /* Fade-in/out shift notice */
                .shift-notice {
                    background: #e0f2fe;
                    color: #0369a1;
                    border: 1px solid #38bdf8;
                    border-radius: 6px;
                    padding: 0.75rem 1rem;
                    margin-top: -0.5rem;
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                    line-height: 1.3rem;
                    opacity: 0;
                    transition: opacity 0.8s ease-in-out;
                }
                .shift-notice.show { opacity: 1; }
                .shift-notice.hide { opacity: 0; }

                form.form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                label {
                    display: flex;
                    flex-direction: column;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #444;
                }
                input, select {
                    width: 100%;
                    margin-top: 0.3rem;
                    padding: 0.8rem;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    font-size: 1rem;
                    transition: border-color 0.2s ease;
                }
                input:focus, select:focus {
                    border-color: #0070f3;
                    outline: none;
                }
                button {
                    padding: 0.8rem;
                    background: #0070f3;
                    color: #fff;
                    border: none;
                    border-radius: 5px;
                    font-size: 1rem;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background 0.2s ease;
                }
                button:hover { background: #005bb5; }
                button:disabled { background: #ccc; cursor: not-allowed; }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal {
                    background: #fff;
                    padding: 1.5rem 2rem;
                    border-radius: 10px;
                    max-width: 380px;
                    width: 90%;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                    text-align: center;
                    animation: fadeIn 0.2s ease-in-out;
                }
                .modal h3 { margin-bottom: 0.5rem; font-size: 1.2rem; }
                .modal p { margin-bottom: 1rem; color: #555; }
                .modal-buttons {
                    display: flex;
                    justify-content: space-around;
                    gap: 0.5rem;
                }
                .modal-buttons button {
                    flex: 1;
                    padding: 0.6rem;
                    font-size: 1rem;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    border: none;
                    transition: background 0.2s ease;
                }
                .modal-buttons .confirm {
                    background: #0070f3;
                    color: white;
                }
                .modal-buttons .confirm:hover { background: #005bb5; }
                .modal-buttons .cancel {
                    background: #d1d5db;
                    color: #333;
                }
                .modal-buttons .cancel:hover { background: #9ca3af; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </main>
    );
}
