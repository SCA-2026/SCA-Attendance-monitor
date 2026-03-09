const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking admin credentials...');

// Check admin user
db.get('SELECT * FROM users WHERE role = ?', ['admin'], (err, row) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    if (row) {
        console.log('Admin user found:');
        console.log('ID:', row.id);
        console.log('Username:', row.username);
        console.log('Stored Password Hash:', row.password);
        
        // Test password verification
        const testPasswords = ['admin123', 'newpassword123'];
        testPasswords.forEach(pwd => {
            const isValid = bcrypt.compareSync(pwd, row.password);
            console.log(`Password "${pwd}" valid:`, isValid);
        });
        
    } else {
        console.log('No admin user found!');
    }
    
    db.close();
});
