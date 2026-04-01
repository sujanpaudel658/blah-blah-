-- Profile picture path, e.g. /uploads/profiles/user-1-1234567890.jpg
ALTER TABLE users
ADD COLUMN profile_image VARCHAR(500) NULL AFTER phone;
