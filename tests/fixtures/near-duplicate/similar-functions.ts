interface User {
  id: number;
  name: string;
  email: string;
}

interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
}

function formatUser(user: User) {
  return {
    id: user.id,
    name: user.name.trim(),
    email: user.email.toLowerCase(),
    role: 'user',
    createdAt: new Date().toISOString(),
  };
}

function formatAdmin(admin: Admin) {
  return {
    id: admin.id,
    name: admin.name.trim(),
    email: admin.email.toLowerCase(),
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
}
