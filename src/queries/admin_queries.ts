export const admin_lookup = `select count(*) as count from admins where email = ? or phone = ?`;
export const create_admin = `insert into admins (first_name, last_name, email, phone, password, secret_token) values (?, ?, ?, ?, ?, ?)`;
export const get_secret = `select secret_token from admins where id = ?`;
export const find_user = `select id, password from admins where email = ?`;
export const find_trainer = `select count(*) as count from trainers where email = ?`;
export const create_trainer = `insert into trainers (first_name,last_name,email) values (?,?,?)`;
export const fetch_trainers = `select id,first_name,last_name,email,phone,address_one,address_two,city,state,district,country,pincode,invite_status,status,last_login from trainers`;
export const find_user_by_id = `select * from trainers where id in (?)`;
export const update_invite_status = `update trainers set invite_status = 1 where id = ?`;
export const find_admin = `select first_name, last_name, email, phone, email_verified, phone_verified from admins where id = ?`;
