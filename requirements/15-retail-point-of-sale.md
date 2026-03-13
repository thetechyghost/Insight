# 15. Retail & Point of Sale

This document defines the functional requirements for the Retail & Point of Sale domain of the Insight fitness platform. This domain encompasses all capabilities related to product catalog management, in-person and online sales transactions, inventory control, and integration with external e-commerce and financial systems. It ensures that fitness businesses can sell physical and digital products through multiple channels with accurate inventory tracking, flexible payment options, and unified reporting.

---

## 15.1 Product Management

**FR-RP-001**
The system shall provide a product catalog that supports the creation and management of product records, including name, description, images, and variants.

**FR-RP-002**
The system shall support hierarchical category organization, allowing administrators to assign products to categories and subcategories for structured catalog navigation.

**FR-RP-003**
The system shall track real-time inventory stock levels for each product and product variant.

**FR-RP-004**
The system shall generate configurable low-stock alerts when inventory levels for a product fall below an administrator-defined threshold.

**FR-RP-005**
The system shall support barcode and SKU assignment for each product and product variant, enabling unique identification and lookup.

**FR-RP-006**
The system shall support product variants, allowing a single product to have multiple variations based on attributes such as size and color, each with independent stock levels and pricing.

**FR-RP-007**
The system shall support multiple pricing tiers per product, including regular pricing, sale pricing, and member-specific pricing.

**FR-RP-008**
The system shall provide supplier management capabilities, enabling administrators to create and maintain supplier records and associate suppliers with products for procurement tracking.

---

## 15.2 In-Person Sales

**FR-RP-009**
The system shall provide a mobile point-of-sale interface optimized for phone and tablet devices, enabling staff to process in-person sales transactions.

**FR-RP-010**
The system shall support barcode scanning via device camera or connected scanner for product lookup and addition to a sales transaction.

**FR-RP-011**
The system shall provide cart management for in-person sales, allowing staff to add, remove, and modify items and quantities before completing a transaction.

**FR-RP-012**
The system shall support multiple payment methods for in-person sales, including credit/debit card, cash, and member account credit.

**FR-RP-013**
The system shall generate receipts for completed in-person sales transactions, with delivery options including email, print, and SMS.

**FR-RP-014**
The system shall attribute each in-person sale to the staff member who processed the transaction, enabling staff-level sales tracking and reporting.

**FR-RP-015**
The system shall provide a configurable processing fee pass-through option for in-person sales, allowing tenants to add payment processing fees to the customer's total.

---

## 15.3 Online Sales

**FR-RP-016**
The system shall provide an in-app product store accessible to members and customers for browsing and purchasing products.

**FR-RP-017**
The system shall support product browsing by category and keyword search within the online store.

**FR-RP-018**
The system shall provide a shopping cart for online sales, allowing customers to add, remove, and modify items and quantities before proceeding to checkout.

**FR-RP-019**
The system shall provide a secure checkout process for online sales that supports saved payment methods and standard payment card entry.

**FR-RP-020**
The system shall generate order confirmation notifications upon successful completion of an online purchase, delivered via email and in-app notification.

**FR-RP-021**
The system shall provide order tracking capabilities, allowing customers to view the status of their orders from placement through fulfillment.

**FR-RP-022**
The system shall support shipping management for physical products sold online, including shipping method selection, carrier tracking number entry, and shipment status updates.

**FR-RP-023**
The system shall support digital product delivery, enabling automatic fulfillment of digital goods upon successful purchase completion.

---

## 15.4 Integration

**FR-RP-024**
The system shall integrate with Shopify to support extended e-commerce functionality, enabling product listing, order management, and storefront capabilities through the Shopify platform.

**FR-RP-025**
The system shall synchronize inventory levels across all sales channels, ensuring that stock quantities are consistent between in-person POS, online store, and any connected external e-commerce platforms.

**FR-RP-026**
The system shall integrate retail and point-of-sale transaction data with the platform's financial reporting system, ensuring that all sales revenue, taxes, and fees are reflected in consolidated financial reports.

**FR-RP-027**
The system shall support commission tracking for staff sales, calculating commissions based on configurable rules and attributing them to the staff member associated with each transaction.
