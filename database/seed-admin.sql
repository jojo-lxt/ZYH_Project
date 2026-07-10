INSERT INTO console_users (id, name, phone, role, password_hash, status)
VALUES (
           'admin-' || :'admin_phone',
           :'admin_name',
           :'admin_phone',
           '管理员',
           :'admin_password_hash',
           'active'
       )
    ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    status = 'active';
