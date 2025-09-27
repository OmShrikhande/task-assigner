const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://title-selector-default-rtdb.firebaseio.com" // Hardcoded from .env or use process.env
  });
  console.log("Firebase Admin initialized with serviceAccountKey.json");
} else {
  console.warn("WARNING: serviceAccountKey.json not found. Backend operations needing Admin SDK will fail.");
}

const db = admin.database();

// Validate Secret Code Endpoint
app.post('/api/validate-secret', async (req, res) => {
  const { groupNumber, secretCode } = req.body;
  if (!groupNumber || !secretCode) return res.status(400).send('Missing fields');

  try {
    const snapshot = await db.ref(`groups/${groupNumber}`).once('value');
    const groupData = snapshot.val();

    if (!groupData) return res.status(404).send('Group not found');
    if (groupData.secretCode !== secretCode) return res.status(401).send('Invalid Secret Code');
    if (groupData.isAssigned) return res.status(400).send('Group already assigned');

    res.send({ valid: true });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Register Team Endpoint
app.post('/api/register', async (req, res) => {
  const { 
    leaderEmail, 
    leaderName, 
    college, 
    contact, 
    teamName, 
    members, 
    groupNumber, 
    secretCode, 
    projectTitle,
    locationMode
  } = req.body;

  if (!leaderEmail || !groupNumber || !secretCode || !projectTitle) {
    return res.status(400).send('Missing required fields');
  }

  try {
    // Transaction to ensure atomicity
    const result = await db.ref().transaction((currentData) => {
      if (!currentData) return currentData; // Should not happen if DB initialized

      const groups = currentData.groups || {};
      const titles = currentData.titles || {};
      const teams = currentData.teams || {};

      // Validate Group
      if (!groups[groupNumber]) return; // Abort, handled outside
      if (groups[groupNumber].secretCode !== secretCode) return; // Abort
      if (groups[groupNumber].isAssigned) return; // Abort

      // Validate Title
      // Assuming titles are stored as keys or objects. Let's assume title ID or Name.
      // If title is just a string in a list, we need to find it and check if used.
      // Let's assume titles structure: { "Title 1": { assigned: false }, ... }
      if (!titles[projectTitle]) return; // Title not found
      if (titles[projectTitle].assigned) return; // Title taken

      // Prepare updates
      groups[groupNumber].isAssigned = true;
      titles[projectTitle].assigned = true;
      
      const newTeamId = leaderEmail.replace(/\./g, ','); // Simple ID from email
      teams[newTeamId] = {
        leaderEmail,
        leaderName,
        college,
        contact,
        teamName,
        members,
        groupNumber,
        projectTitle,
        locationMode,
        timestamp: Date.now()
      };

      return { ...currentData, groups, titles, teams };
    });

    if (result.committed) {
      res.send({ success: true, message: 'Registration Successful' });
    } else {
      res.status(400).send({ success: false, message: 'Registration Failed. Title or Group might be taken or Invalid Secret.' });
    }

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});