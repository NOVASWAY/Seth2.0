const bcrypt = require('bcrypt');

async function testPassword() {
    const password = 'admin123';
    const storedHash = '$2b$12$LQv3c1yqBwEHxv03kpDOCOYMvnK5UrDD.VGoj0x9Z.aO0LE5.dKK6';
    
    console.log('Testing password:', password);
    console.log('Stored hash:', storedHash);
    
    // Generate a new hash
    const newHash = await bcrypt.hash(password, 12);
    console.log('New hash:', newHash);
    
    // Test if password matches stored hash
    const matchesStored = await bcrypt.compare(password, storedHash);
    console.log('Password matches stored hash:', matchesStored);
    
    // Test if password matches new hash
    const matchesNew = await bcrypt.compare(password, newHash);
    console.log('Password matches new hash:', matchesNew);
    
    // Test with different password
    const wrongPassword = 'wrongpass';
    const matchesWrong = await bcrypt.compare(wrongPassword, storedHash);
    console.log('Wrong password matches stored hash:', matchesWrong);
}

testPassword().catch(console.error);
