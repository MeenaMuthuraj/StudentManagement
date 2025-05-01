const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    profileImage: String
});

module.exports = mongoose.model('Teacher', TeacherSchema);
