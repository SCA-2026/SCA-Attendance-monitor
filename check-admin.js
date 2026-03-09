const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking admin user...');

db.get('SELECT * FROM users WHERE role = ?', ['admin'], (err, row) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    if (row) {
        console.log('Admin user found:');
        console.log('ID:', row.id);
        console.log('Username:', row.username);
        console.log('Employee ID:', row.employee_id);
        console.log('Full Name:', row.full_name);
        console.log('Email:', row.email);
        console.log('Role:', row.role);
    } else {
        console.log('No admin user found!');
        console.log('Creating default admin user...');
        
        const bcrypt = require('bcrypt');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        
        db.run('INSERT INTO users (username, employee_id, full_name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            ['admin', 'ADMIN001', 'System Administrator', 'admin@sca.com', hashedPassword, 'admin', new Date().toISOString()],
            function(err) {
                if (err) {
                    console.error('Error creating admin user:', err);
                } else {
                    console.log('Default admin user created successfully!');
                    console.log('Username: admin');
                    console.log('Password: admin123');
                }
                db.close();
            }
        );
    }
});

db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (!err) {
        console.log('Total users in database:', row.count);
    }
});
