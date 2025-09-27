import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../firebase';
import axios from 'axios';

export default function Register({ user }) {
  const [locationMode, setLocationMode] = useState('Fetching location...');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [titles, setTitles] = useState([]);
  const [existingTeam, setExistingTeam] = useState(null);
  
  const [formData, setFormData] = useState({
    leaderName: '',
    college: '',
    contact: '',
    teamName: '',
    membersCount: 0,
    members: [],
    groupNumber: '',
    secretCode: '',
    projectTitle: ''
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    // 1. Location Detection
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const state = data.address.state;
          
          if (state === "Maharashtra") {
            setLocationMode("Offline");
          } else {
            setLocationMode("Online");
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          setLocationMode("Online (Default - Location Error)");
        } finally {
          setLoadingLocation(false);
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        setLocationMode("Online (Default - Permission Denied)");
        setLoadingLocation(false);
      });
    } else {
      setLocationMode("Online (Default - No Geolocation)");
      setLoadingLocation(false);
    }

    // 2. Fetch Titles
    const titlesRef = ref(db, 'titles');
    get(titlesRef).then((snapshot) => {
      if (snapshot.exists()) {
        const titlesData = snapshot.val();
        // Convert object to array
        const titlesArray = Object.keys(titlesData).map(key => ({
          id: key,
          ...titlesData[key]
        }));
        setTitles(titlesArray);
      }
    });

    // 3. Check Existing Registration
    const teamId = user.email.replace(/\./g, ',');
    const teamRef = ref(db, `teams/${teamId}`);
    get(teamRef).then((snapshot) => {
      if (snapshot.exists()) {
        setExistingTeam(snapshot.val());
      }
    });

  }, [user.email]);

  const handleMemberCountChange = (e) => {
    const count = parseInt(e.target.value) || 0;
    const currentMembers = [...formData.members];
    
    if (count > currentMembers.length) {
      for (let i = currentMembers.length; i < count; i++) {
        currentMembers.push({ name: '', email: '', role: '' });
      }
    } else {
      currentMembers.length = count;
    }
    
    setFormData({ ...formData, membersCount: count, members: currentMembers });
  };

  const handleMemberChange = (index, field, value) => {
    const updatedMembers = [...formData.members];
    updatedMembers[index][field] = value;
    setFormData({ ...formData, members: updatedMembers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Submitting...');
    
    try {
      const payload = {
        ...formData,
        leaderEmail: user.email,
        locationMode
      };
      
      const res = await axios.post('http://localhost:5000/api/register', payload);
      setMessage(res.data.message);
      // Refresh to show read-only view
      window.location.reload();
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || 'Registration Failed');
    }
  };

  if (existingTeam) {
    return (
      <div className="register-container">
        <h2>My Team Registration (Read-Only)</h2>
        <p><strong>Status:</strong> Submitted</p>
        <p><strong>Project Title:</strong> {existingTeam.projectTitle}</p>
        <p><strong>Group Number:</strong> {existingTeam.groupNumber}</p>
        <p><strong>Location Mode:</strong> {existingTeam.locationMode}</p>
        <hr />
        <p><strong>Team Name:</strong> {existingTeam.teamName}</p>
        <p><strong>Leader:</strong> {existingTeam.leaderName} ({existingTeam.leaderEmail})</p>
        <p><strong>College:</strong> {existingTeam.college}</p>
        <h3>Members</h3>
        <ul>
          {existingTeam.members && existingTeam.members.map((m, i) => (
            <li key={i}>{m.name} - {m.email}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="register-container">
      <h2>Team Registration</h2>
      <p><strong>Participation Mode:</strong> {loadingLocation ? "Detecting..." : locationMode}</p>
      <p>Logged in as: {user.email}</p>
      
      {message && <p className="message">{message}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Leader Name:</label>
          <input type="text" value={formData.leaderName} onChange={e => setFormData({...formData, leaderName: e.target.value})} required />
        </div>
        
        <div className="form-group">
          <label>College:</label>
          <input type="text" value={formData.college} onChange={e => setFormData({...formData, college: e.target.value})} required />
        </div>

        <div className="form-group">
          <label>Contact Number:</label>
          <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} required />
        </div>

        <div className="form-group">
          <label>Team Name:</label>
          <input type="text" value={formData.teamName} onChange={e => setFormData({...formData, teamName: e.target.value})} required />
        </div>

        <div className="form-group">
          <label>Number of Members (excluding Leader):</label>
          <input type="number" min="0" max="5" value={formData.membersCount} onChange={handleMemberCountChange} required />
        </div>

        {formData.members.map((member, index) => (
          <div key={index} className="member-group">
            <h4>Member {index + 1}</h4>
            <input type="text" placeholder="Name" value={member.name} onChange={e => handleMemberChange(index, 'name', e.target.value)} required />
            <input type="email" placeholder="Email" value={member.email} onChange={e => handleMemberChange(index, 'email', e.target.value)} required />
            <input type="text" placeholder="Role/Skill" value={member.role} onChange={e => handleMemberChange(index, 'role', e.target.value)} />
          </div>
        ))}

        <hr />

        <div className="form-group">
          <label>Group Number:</label>
          <input type="text" value={formData.groupNumber} onChange={e => setFormData({...formData, groupNumber: e.target.value})} required />
        </div>

        <div className="form-group">
          <label>Secret Code:</label>
          <input type="password" value={formData.secretCode} onChange={e => setFormData({...formData, secretCode: e.target.value})} required />
        </div>

        <div className="form-group">
          <label>Select Project Title:</label>
          <select value={formData.projectTitle} onChange={e => setFormData({...formData, projectTitle: e.target.value})} required>
            <option value="">-- Select Title --</option>
            {titles.filter(t => !t.assigned).map(t => (
              <option key={t.id} value={t.id}>{t.id} (Available)</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loadingLocation}>Submit Registration</button>
      </form>
    </div>
  );
}