import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../firebase';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [titles, setTitles] = useState([]);

  const [newGroup, setNewGroup] = useState({ number: '', secret: '' });
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Listen to Teams
    onValue(ref(db, 'teams'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTeams(Object.values(data));
      } else {
        setTeams([]);
      }
    });

    // Listen to Groups
    onValue(ref(db, 'groups'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGroups(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      } else {
        setGroups([]);
      }
    });

    // Listen to Titles
    onValue(ref(db, 'titles'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTitles(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      } else {
        setTitles([]);
      }
    });
  }, []);

  const handleAddGroup = (e) => {
    e.preventDefault();
    if (!newGroup.number || !newGroup.secret) return;
    
    // Check if group exists (client-side check for UI feedback, rules handle security)
    if (groups.find(g => g.id === newGroup.number)) {
      setMessage('Group Number already exists');
      return;
    }

    set(ref(db, 'groups/' + newGroup.number), {
      secretCode: newGroup.secret,
      isAssigned: false
    })
    .then(() => {
      setMessage('Group added successfully');
      setNewGroup({ number: '', secret: '' });
    })
    .catch(err => setMessage('Error: ' + err.message));
  };

  const handleAddTitle = (e) => {
    e.preventDefault();
    if (!newTitle) return;

    if (titles.find(t => t.id === newTitle)) {
      setMessage('Title already exists');
      return;
    }

    set(ref(db, 'titles/' + newTitle), {
      assigned: false
    })
    .then(() => {
      setMessage('Title added successfully');
      setNewTitle('');
    })
    .catch(err => setMessage('Error: ' + err.message));
  };

  return (
    <div className="admin-container">
      <h2>Admin Panel</h2>
      <div className="admin-tabs">
        <button onClick={() => setActiveTab('teams')} className={activeTab === 'teams' ? 'active' : ''}>Registered Teams</button>
        <button onClick={() => setActiveTab('groups')} className={activeTab === 'groups' ? 'active' : ''}>Manage Groups</button>
        <button onClick={() => setActiveTab('titles')} className={activeTab === 'titles' ? 'active' : ''}>Manage Titles</button>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="admin-content">
        {activeTab === 'teams' && (
          <div>
            <h3>Registered Teams ({teams.length})</h3>
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Leader</th>
                  <th>Members</th>
                  <th>Title</th>
                  <th>Group</th>
                  <th>Mode</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, idx) => (
                  <tr key={idx}>
                    <td>{team.teamName}</td>
                    <td>{team.leaderName}<br/>{team.leaderEmail}</td>
                    <td>{team.membersCount}</td>
                    <td>{team.projectTitle}</td>
                    <td>{team.groupNumber}</td>
                    <td>{team.locationMode}</td>
                    <td>{new Date(team.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'groups' && (
          <div>
            <h3>Add New Group</h3>
            <form onSubmit={handleAddGroup} style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Group Number" 
                value={newGroup.number} 
                onChange={e => setNewGroup({...newGroup, number: e.target.value})} 
                required 
              />
              <input 
                type="text" 
                placeholder="Secret Code" 
                value={newGroup.secret} 
                onChange={e => setNewGroup({...newGroup, secret: e.target.value})} 
                required 
              />
              <button type="submit">Create Group</button>
            </form>

            <h3>Existing Groups</h3>
            <ul>
              {groups.map(g => (
                <li key={g.id}>
                  <strong>Group {g.id}</strong> - Status: {g.isAssigned ? 'Assigned' : 'Available'} 
                  (Secret: {g.secretCode}) {/* Showing secret to Admin */}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'titles' && (
          <div>
             <h3>Add New Project Title</h3>
            <form onSubmit={handleAddTitle} style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Project Title" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                required 
                style={{ width: '300px' }}
              />
              <button type="submit">Create Title</button>
            </form>

            <h3>Available Titles</h3>
            <ul>
              {titles.map(t => (
                <li key={t.id}>
                  {t.id} - {t.assigned ? <strong>Assigned</strong> : <span style={{color: 'green'}}>Available</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}