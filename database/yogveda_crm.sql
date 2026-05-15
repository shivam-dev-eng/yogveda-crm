-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 15, 2026 at 02:17 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `yogveda_crm`
--

-- --------------------------------------------------------

--
-- Table structure for table `activities`
--

CREATE TABLE `activities` (
  `id` int(10) UNSIGNED NOT NULL,
  `entity_type` enum('lead','order','customer','user','campaign','system') NOT NULL,
  `entity_id` int(10) UNSIGNED NOT NULL,
  `action` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `performed_by` int(10) UNSIGNED DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `call_logs`
--

CREATE TABLE `call_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `lead_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `call_type` enum('inbound','outbound') NOT NULL DEFAULT 'outbound',
  `duration` int(10) UNSIGNED DEFAULT 0 COMMENT 'seconds',
  `outcome` varchar(300) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `campaigns`
--

CREATE TABLE `campaigns` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `platform` enum('meta','google','email','sms','whatsapp','other') NOT NULL DEFAULT 'meta',
  `status` enum('active','paused','ended') NOT NULL DEFAULT 'active',
  `budget` decimal(12,2) DEFAULT 0.00,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `external_id` varchar(200) DEFAULT NULL COMMENT 'Meta/Google campaign ID',
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `alt_phone` varchar(20) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `first_lead_id` int(10) UNSIGNED DEFAULT NULL,
  `assigned_to` int(10) UNSIGNED DEFAULT NULL,
  `total_orders` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_revenue` decimal(14,2) NOT NULL DEFAULT 0.00,
  `lifetime_value` decimal(14,2) NOT NULL DEFAULT 0.00,
  `avg_order_value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `first_purchase` date DEFAULT NULL,
  `last_purchase` date DEFAULT NULL,
  `shopify_cust_id` varchar(200) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `follow_ups`
--

CREATE TABLE `follow_ups` (
  `id` int(10) UNSIGNED NOT NULL,
  `lead_id` int(10) UNSIGNED NOT NULL,
  `assigned_to` int(10) UNSIGNED NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `status` enum('pending','done','missed','rescheduled') NOT NULL DEFAULT 'pending',
  `type` enum('call','whatsapp','email','visit') NOT NULL DEFAULT 'call',
  `notes` text DEFAULT NULL,
  `rescheduled_to` datetime DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `incentives`
--

CREATE TABLE `incentives` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `lead_id` int(10) UNSIGNED DEFAULT NULL,
  `order_amount` decimal(12,2) NOT NULL,
  `rate` decimal(5,2) NOT NULL COMMENT 'Snapshot of user incentive_rate at time of earning',
  `incentive_amount` decimal(12,2) NOT NULL,
  `status` enum('pending','approved','paid','rejected') NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `integration_settings`
--

CREATE TABLE `integration_settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `key_name` varchar(100) NOT NULL,
  `key_value` text DEFAULT NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT 0,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `integration_settings`
--

INSERT INTO `integration_settings` (`id`, `key_name`, `key_value`, `is_secret`, `updated_by`, `updated_at`) VALUES
(1, 'wa_phone_number_id', '', 0, NULL, '2026-05-13 18:03:04'),
(2, 'wa_access_token', '', 1, NULL, '2026-05-13 18:03:04'),
(3, 'wa_verify_token', 'yogveda_verify_2025', 0, NULL, '2026-05-13 18:03:04'),
(4, 'shopify_store_domain', '', 0, NULL, '2026-05-13 18:03:04'),
(5, 'shopify_admin_api_key', '', 1, NULL, '2026-05-13 18:03:04'),
(6, 'shopify_webhook_secret', '', 1, NULL, '2026-05-13 18:03:04'),
(7, 'makecom_webhook_active', '1', 0, NULL, '2026-05-13 18:03:04');

-- --------------------------------------------------------

--
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `alt_phone` varchar(20) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `age` tinyint(3) UNSIGNED DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `source` enum('call','whatsapp','referral','campaign','website','meta_ads','shopify') NOT NULL DEFAULT 'call',
  `category` varchar(120) NOT NULL,
  `supplement` varchar(120) DEFAULT NULL,
  `campaign_id` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('new','in_process','follow_up','converted','delivered','closed_lost') NOT NULL DEFAULT 'new',
  `assigned_to` int(10) UNSIGNED DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `assigned_by` int(10) UNSIGNED DEFAULT NULL,
  `is_manual_assign` tinyint(1) NOT NULL DEFAULT 0,
  `product_name` varchar(300) DEFAULT NULL,
  `order_amount` decimal(12,2) DEFAULT NULL COMMENT 'Disabled when status=new',
  `tracking_id` varchar(200) DEFAULT NULL COMMENT 'Required when status=delivered',
  `is_repeat` tinyint(1) NOT NULL DEFAULT 0,
  `repeat_count` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `linked_customer_id` int(10) UNSIGNED DEFAULT NULL,
  `is_duplicate` tinyint(1) NOT NULL DEFAULT 0,
  `duplicate_of` int(10) UNSIGNED DEFAULT NULL,
  `next_followup_at` datetime DEFAULT NULL,
  `last_followup_at` datetime DEFAULT NULL,
  `followup_count` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `revenue_countable` tinyint(1) NOT NULL DEFAULT 0,
  `delivered_at` datetime DEFAULT NULL,
  `external_id` varchar(200) DEFAULT NULL COMMENT 'Meta lead ID or Shopify order ID',
  `external_source` enum('meta','shopify') DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lead_notes`
--

CREATE TABLE `lead_notes` (
  `id` int(10) UNSIGNED NOT NULL,
  `lead_id` int(10) UNSIGNED NOT NULL,
  `added_by` int(10) UNSIGNED NOT NULL,
  `note` text NOT NULL,
  `is_private` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(10) UNSIGNED NOT NULL,
  `lead_id` int(10) UNSIGNED DEFAULT NULL,
  `customer_id` int(10) UNSIGNED DEFAULT NULL,
  `assigned_to` int(10) UNSIGNED NOT NULL,
  `product_name` varchar(300) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `qty` smallint(5) UNSIGNED NOT NULL DEFAULT 1,
  `tracking_id` varchar(200) DEFAULT NULL,
  `courier` varchar(100) DEFAULT NULL,
  `order_date` datetime DEFAULT current_timestamp(),
  `dispatch_date` datetime DEFAULT NULL,
  `delivery_date` datetime DEFAULT NULL,
  `status` enum('pending','dispatched','delivered','returned','cancelled') NOT NULL DEFAULT 'pending',
  `revenue_countable` tinyint(1) NOT NULL DEFAULT 0,
  `is_repeat` tinyint(1) NOT NULL DEFAULT 0,
  `order_index` smallint(5) UNSIGNED NOT NULL DEFAULT 1,
  `shopify_order_id` varchar(200) DEFAULT NULL,
  `source` enum('crm','shopify') NOT NULL DEFAULT 'crm',
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `lead_id` int(10) UNSIGNED DEFAULT NULL,
  `order_id` int(10) UNSIGNED DEFAULT NULL,
  `product_name` varchar(300) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `tracking_id` varchar(200) DEFAULT NULL,
  `order_date` date NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `source` enum('crm','shopify') DEFAULT 'crm',
  `shopify_order_id` varchar(200) DEFAULT NULL,
  `status` enum('pending','dispatched','delivered','returned') NOT NULL DEFAULT 'delivered',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `round_robin`
--

CREATE TABLE `round_robin` (
  `id` int(10) UNSIGNED NOT NULL,
  `category` varchar(120) NOT NULL,
  `current_index` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `last_user_id` int(10) UNSIGNED DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `round_robin`
--

INSERT INTO `round_robin` (`id`, `category`, `current_index`, `last_user_id`, `updated_at`) VALUES
(1, 'Kidney Stone Treatment', 1, 3, '2026-05-14 10:16:16'),
(2, 'Gall Stone Treatment', 0, NULL, '2026-05-13 18:03:04'),
(3, 'UTI Treatment', 0, NULL, '2026-05-13 18:03:04'),
(4, 'CKD Treatment', 0, NULL, '2026-05-13 18:03:04'),
(5, 'Thyroid Treatment', 0, NULL, '2026-05-13 18:03:04'),
(6, 'Piles Treatment', 0, NULL, '2026-05-13 18:03:04'),
(7, 'PCOS/PCOD Treatment', 0, NULL, '2026-05-13 18:03:04'),
(8, 'Arthritis Treatment', 0, NULL, '2026-05-13 18:03:04'),
(9, 'Diabetes Treatment', 0, NULL, '2026-05-13 18:03:04'),
(10, 'High Blood Pressure', 0, NULL, '2026-05-13 18:03:04'),
(11, 'Heart Treatment', 0, NULL, '2026-05-13 18:03:04'),
(12, 'Prostate Treatment', 0, NULL, '2026-05-13 18:03:04'),
(13, 'Supplements', 0, NULL, '2026-05-13 18:03:04'),
(14, 'General', 0, NULL, '2026-05-13 18:03:04');

-- --------------------------------------------------------

--
-- Table structure for table `status_history`
--

CREATE TABLE `status_history` (
  `id` int(10) UNSIGNED NOT NULL,
  `lead_id` int(10) UNSIGNED NOT NULL,
  `from_status` varchar(50) DEFAULT NULL,
  `to_status` varchar(50) NOT NULL,
  `changed_by` int(10) UNSIGNED DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','sub_admin','sales') NOT NULL DEFAULT 'sales',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `incentive_rate` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Percentage of delivered order amount',
  `designation` varchar(100) DEFAULT NULL,
  `refresh_token` text DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `is_active`, `incentive_rate`, `designation`, `refresh_token`, `last_login`, `created_by`, `created_at`, `updated_at`) VALUES
(3, 'Sales User', 'sales@yogveda.com', '9999999998', '$2a$12$GKpmt0tB1kje4A8jvPdcZeUcc20S2Tw1fbsV33PgNS0gyWLnieZUK', 'sales', 1, 0.00, NULL, NULL, '2026-05-15 17:46:33', NULL, '2026-05-13 23:07:42', '2026-05-15 17:46:38'),
(5, 'Admin', 'admin@yogveda.com', '9999999999', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, 0.00, NULL, NULL, '2026-05-15 17:46:25', NULL, '2026-05-14 11:10:09', '2026-05-15 17:46:29');

-- --------------------------------------------------------

--
-- Table structure for table `user_categories`
--

CREATE TABLE `user_categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `category` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `webhook_logs`
--

CREATE TABLE `webhook_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `source` enum('meta','shopify','whatsapp','make_com') NOT NULL,
  `event` varchar(100) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `status` enum('received','processing','success','failed') NOT NULL DEFAULT 'received',
  `error_msg` text DEFAULT NULL,
  `retry_count` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `processed_at` datetime DEFAULT NULL,
  `lead_id` int(10) UNSIGNED DEFAULT NULL,
  `order_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activities`
--
ALTER TABLE `activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`,`created_at`),
  ADD KEY `idx_performer` (`performed_by`,`created_at`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `call_logs`
--
ALTER TABLE `call_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lead` (`lead_id`),
  ADD KEY `fk_call_user` (`user_id`);

--
-- Indexes for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_platform` (`platform`),
  ADD KEY `fk_camp_user` (`created_by`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_phone` (`phone`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_revenue` (`total_revenue`),
  ADD KEY `idx_last_buy` (`last_purchase`),
  ADD KEY `idx_assigned` (`assigned_to`),
  ADD KEY `fk_cust_lead` (`first_lead_id`);
ALTER TABLE `customers` ADD FULLTEXT KEY `ft_cust` (`name`,`phone`,`email`);

--
-- Indexes for table `follow_ups`
--
ALTER TABLE `follow_ups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assigned_sched` (`assigned_to`,`scheduled_at`,`status`),
  ADD KEY `idx_lead` (`lead_id`),
  ADD KEY `idx_sched_status` (`scheduled_at`,`status`);

--
-- Indexes for table `incentives`
--
ALTER TABLE `incentives`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_order` (`order_id`),
  ADD KEY `idx_user_status` (`user_id`,`status`),
  ADD KEY `idx_user_created` (`user_id`,`created_at`),
  ADD KEY `fk_inc_lead` (`lead_id`);

--
-- Indexes for table `integration_settings`
--
ALTER TABLE `integration_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_key` (`key_name`),
  ADD KEY `fk_is_user` (`updated_by`);

--
-- Indexes for table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phone` (`phone`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status_assigned` (`status`,`assigned_to`),
  ADD KEY `idx_status_created` (`status`,`created_at`),
  ADD KEY `idx_assigned_fu` (`assigned_to`,`status`,`next_followup_at`),
  ADD KEY `idx_category_status` (`category`,`status`),
  ADD KEY `idx_source_created` (`source`,`created_at`),
  ADD KEY `idx_campaign` (`campaign_id`),
  ADD KEY `idx_followup` (`next_followup_at`,`status`),
  ADD KEY `idx_revenue` (`revenue_countable`,`delivered_at`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_external` (`external_id`,`external_source`),
  ADD KEY `fk_lead_created` (`created_by`);
ALTER TABLE `leads` ADD FULLTEXT KEY `ft_leads` (`name`,`phone`,`email`,`product_name`);

--
-- Indexes for table `lead_notes`
--
ALTER TABLE `lead_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lead` (`lead_id`),
  ADD KEY `fk_note_user` (`added_by`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lead` (`lead_id`),
  ADD KEY `idx_customer` (`customer_id`),
  ADD KEY `idx_agent` (`assigned_to`,`status`),
  ADD KEY `idx_revenue` (`revenue_countable`,`delivery_date`),
  ADD KEY `idx_shopify` (`shopify_order_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer` (`customer_id`),
  ADD KEY `idx_lead` (`lead_id`);

--
-- Indexes for table `round_robin`
--
ALTER TABLE `round_robin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_category` (`category`);

--
-- Indexes for table `status_history`
--
ALTER TABLE `status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lead` (`lead_id`),
  ADD KEY `fk_sh_user` (`changed_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_email` (`email`),
  ADD UNIQUE KEY `uq_phone` (`phone`),
  ADD KEY `idx_role_active` (`role`,`is_active`);

--
-- Indexes for table `user_categories`
--
ALTER TABLE `user_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_cat` (`user_id`,`category`),
  ADD KEY `idx_category` (`category`);

--
-- Indexes for table `webhook_logs`
--
ALTER TABLE `webhook_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_source` (`source`,`created_at`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `fk_wl_lead` (`lead_id`),
  ADD KEY `fk_wl_order` (`order_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activities`
--
ALTER TABLE `activities`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `call_logs`
--
ALTER TABLE `call_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `campaigns`
--
ALTER TABLE `campaigns`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `follow_ups`
--
ALTER TABLE `follow_ups`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `incentives`
--
ALTER TABLE `incentives`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `integration_settings`
--
ALTER TABLE `integration_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `lead_notes`
--
ALTER TABLE `lead_notes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `round_robin`
--
ALTER TABLE `round_robin`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `status_history`
--
ALTER TABLE `status_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_categories`
--
ALTER TABLE `user_categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `webhook_logs`
--
ALTER TABLE `webhook_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activities`
--
ALTER TABLE `activities`
  ADD CONSTRAINT `fk_act_user` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `call_logs`
--
ALTER TABLE `call_logs`
  ADD CONSTRAINT `fk_call_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_call_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD CONSTRAINT `fk_camp_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_cust_lead` FOREIGN KEY (`first_lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cust_user` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `follow_ups`
--
ALTER TABLE `follow_ups`
  ADD CONSTRAINT `fk_fu_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_fu_user` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `incentives`
--
ALTER TABLE `incentives`
  ADD CONSTRAINT `fk_inc_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_inc_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_inc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `integration_settings`
--
ALTER TABLE `integration_settings`
  ADD CONSTRAINT `fk_is_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `leads`
--
ALTER TABLE `leads`
  ADD CONSTRAINT `fk_lead_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lead_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_lead_created` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `lead_notes`
--
ALTER TABLE `lead_notes`
  ADD CONSTRAINT `fk_note_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_note_user` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_ord_agent` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ord_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ord_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `fk_pur_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pur_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `status_history`
--
ALTER TABLE `status_history`
  ADD CONSTRAINT `fk_sh_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sh_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_categories`
--
ALTER TABLE `user_categories`
  ADD CONSTRAINT `fk_uc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `webhook_logs`
--
ALTER TABLE `webhook_logs`
  ADD CONSTRAINT `fk_wl_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wl_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL;

DELIMITER $$
--
-- Events
--
CREATE DEFINER=`root`@`localhost` EVENT `cleanup_webhook_logs` ON SCHEDULE EVERY 1 DAY STARTS '2026-05-13 18:03:04' ON COMPLETION NOT PRESERVE ENABLE DO DELETE FROM `webhook_logs` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 90 DAY)$$

CREATE DEFINER=`root`@`localhost` EVENT `cleanup_old_activities` ON SCHEDULE EVERY 1 WEEK STARTS '2026-05-13 18:03:04' ON COMPLETION NOT PRESERVE ENABLE DO DELETE FROM `activities` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 2 YEAR)$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
