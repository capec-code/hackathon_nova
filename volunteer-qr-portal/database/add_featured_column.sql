-- Migration to add featured highlights functionality to the gallery
ALTER TABLE `gallery_items` ADD COLUMN `is_featured` TINYINT(1) DEFAULT 0 AFTER `day`;
