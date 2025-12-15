import React, { useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiFetch";

  const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editing, setEditing] = useState(null); // holds the user/device being edited
  const [deleteId, setDeleteId] = useState(null); // holds the id to confirm delete

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("https://viz.vjratechnologies.com/api/users");
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Users Management</h2>
      <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
  <input
    type="text"
    placeholder="Search users..."
    value={searchText}
    onChange={e => setSearchText(e.target.value)}
    style={{ padding: 6, width: 220, fontSize: 14 }}
  />
  {/* Role filter */}
  <select
    value={roleFilter}
    onChange={e => setRoleFilter(e.target.value)}
    style={{ padding: 6, fontSize: 14 }}
  >
    <option value="">All Roles</option>
    <option value="admin">Admin</option>
    <option value="owner">Owner</option>
    <option value="customer">Customer</option>
  </select>
</div>
<table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
  <thead>
    <tr>
      <th>User ID</th>
      <th>Name</th>
      <th>Mobile</th>
      <th>Role</th>
      <th>Email</th>
      <th>Vehicle Type</th>
      <th>Google ID</th>
      <th>Created At</th>
      <th>Updated At</th>
      <th>Edit</th>
      <th>Delete</th>
    </tr>
  </thead>
  <tbody>
    {users
      .filter(user => {
        const values = [
          user.id, user._id, user.name, user.mobile, user.role,
          user.email, user.VehicleType, user.googleId,
        ].join(" ").toLowerCase();
        const found = values.includes(searchText.toLowerCase());
        const filterRole = !roleFilter || (user.role && user.role.toLowerCase() === roleFilter.toLowerCase());
        return found && filterRole;
      })
      .map((user) => (
        <tr key={user.id || user._id}>
          <td>{user.id || user._id}</td>
          <td>{user.name}</td>
          <td>{user.mobile}</td>
          <td>{user.role}</td>
          <td>{user.email}</td>
          <td>{user.VehicleType}</td>
          <td>{user.googleId}</td>
          <td>{user.createdAt ? new Date(user.createdAt).toLocaleString() : ""}</td>
          <td>{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : ""}</td>
          <td>
            <button
                style={{ background: "#1976d2", color: "#fff", border: 0, borderRadius: 3, padding: "4px 12px" }}
                onClick={() => setEditing(user)} // user = user or device
            >
                Edit
            </button>
            </td>
            <td>
            <button
                style={{ background: "#d32f2f", color: "#fff", border: 0, borderRadius: 3, padding: "4px 12px" }}
                onClick={() => setDeleteId(user.id || user._id)}
            >
                Delete
            </button>
            </td>

        </tr>
      ))}
    {users.length === 0 && (
      <tr>
        <td colSpan="11" style={{ textAlign: "center" }}>No users found.</td>
      </tr>
    )}
  </tbody>
</table>
{/* EDIT MODAL */}
{editing && (
  <div
    style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1111
    }}
    onClick={() => setEditing(null)}
  >
    <div
      style={{ background: "#fff", padding: 24, borderRadius: 6, minWidth: 350, minHeight: 280 }}
      onClick={e => e.stopPropagation()}
    >
      <h3>Edit {editing.name || editing.device_id}</h3>
      {/* Render inputs based on user */}
      {Object.keys(editing).map(key =>
        (key !== "id" && key !== "_id") ? (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ minWidth: 120, display: "inline-block" }}>{key}:</label>
            <input
              type="text"
              value={editing[key] || ""}
              onChange={e => setEditing({ ...editing, [key]: e.target.value })}
              style={{ padding: 6, width: 170 }}
            />
          </div>
        ) : null
      )}
      <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
        <button
          style={{ background: "#1976d2", color: "#fff", border: 0, borderRadius: 3, padding: "4px 18px" }}
          onClick={async () => {
            // API PATCH (or PUT) call
            try {
              const id = editing.id || editing._id;
              const endpoint =
                /* set endpoint for user/device: */ 
                `${window.location.pathname.includes("user") ? "https://viz.vjratechnologies.com/api/users/" : "https://viz.vjratechnologies.com/api/devices/"}${id}`;
              await apiFetch(endpoint, {
                method: "PUT",
                body: JSON.stringify(editing),
              });
              // reload the list (refetch or update state)
              setEditing(null);
              window.location.reload(); // or trigger your fetch again for better UX
            } catch (e) {
              alert("Update failed: " + e.message);
            }
          }}
        >
          Save
        </button>
        <button onClick={() => setEditing(null)}>Cancel</button>
      </div>
    </div>
  </div>
)}
{/* DELETE MODAL */}
{deleteId && (
  <div
    style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000
    }}
    onClick={() => setDeleteId(null)}
  >
    <div
      style={{ background: "#fff", padding: 32, borderRadius: 8, minWidth: 290 }}
      onClick={e => e.stopPropagation()}
    >
      <h3>Confirm Delete</h3>
      <p>Are you sure you want to delete this {window.location.pathname.includes("user") ? "user" : "device"}?</p>
      <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
        <button
          style={{ background: "#d32f2f", color: "#fff", border: 0, borderRadius: 3, padding: "4px 18px" }}
          onClick={async () => {
            try {
              const endpoint =
                /* set endpoint for user/device: */
                `${window.location.pathname.includes("user") ? "https://viz.vjratechnologies.com/api/users/" : "https://viz.vjratechnologies.com/api/devices/"}${deleteId}`;
              await apiFetch(endpoint, { method: "DELETE" });
              setDeleteId(null);
              window.location.reload(); // or refresh your data fetch
            } catch (e) {
              alert("Delete failed: " + e.message);
            }
          }}
        >
          Delete
        </button>
        <button onClick={() => setDeleteId(null)}>Cancel</button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default UsersManagement;
