// app.js — shared utilities

function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) window.location.href = 'login.html';
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); }
  catch { return null; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}
