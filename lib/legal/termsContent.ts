// Cenaiva Terms of Service — canonical text shipped 2026-05-21.
//
// Source: user-provided canonical content (mobile-legal-handoff.md notes
// the web sister repo at apps/web/src/lib/legal/termsContent.ts is the
// upstream source of truth; we keep mobile in sync verbatim).
//
// AGE OVERRIDE: the canonical text originally said "13" as the minimum
// age. The user (legal owner) confirmed 2026-05-21 the legal age for
// Cenaiva is 16. All "13" age references in this file have been
// substituted with "16" per that confirmation. Every other word
// preserved verbatim.

import type { LegalSection } from './types';
import {
  TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_LAST_UPDATED,
} from './versions';

export { TERMS_VERSION, TERMS_EFFECTIVE_DATE, TERMS_LAST_UPDATED };

export const TERMS_INTRO =
  'Welcome to Cenaiva. These Terms of Service ("Terms") govern your access to and use of the Cenaiva mobile application and related services ("Services") as a consumer or diner. Restaurant partners and operators are subject to a separate Restaurant Partner Agreement. By creating an account or using the Services, you agree to be bound by these Terms. If you do not agree, you must stop using the Services immediately.';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: '1. Eligibility',
    paragraphs: [
      'You must be at least 16 years old to use Cenaiva. If you are between 16 and 18 years of age, you confirm that you have obtained consent from a parent or legal guardian, and that your parent or guardian agrees to these Terms on your behalf.',
      'Users who make payments, use wallet features, redeem rewards with monetary value, or purchase event tickets must be at least 18 years old, or have express parental authorization to do so.',
      'By using the Services, you confirm that you meet the applicable eligibility requirements and that you are not prohibited from using the Services under the laws of any applicable jurisdiction.',
    ],
  },
  {
    heading: '2. Account Registration',
    paragraphs: [
      'To access certain features, you must create an account. You agree to:',
      '• Provide accurate, complete, and up-to-date information, including your name, email address, and phone number where requested',
      '• Keep your login credentials confidential and secure',
      '• Be solely responsible for all activity that occurs under your account',
      '• Notify us immediately at help@cenaiva.com if you suspect unauthorized access to your account',
      'We reserve the right to suspend or terminate accounts that provide false information, violate these Terms, or have been inactive for an extended period.',
      'You may sign in using email/password, phone number (OTP), or Google OAuth. By using a third-party sign-in method, you authorize us to access and use certain information from that provider in accordance with our Privacy Policy.',
      'If you have previously created an account using a different sign-in method (for example, once with email and once with a phone number), Cenaiva may detect and offer to merge duplicate accounts associated with the same identity. An audit record of any account merge is retained for fraud prevention and support purposes. You may contact us at help@cenaiva.com if you believe an account merge occurred in error.',
    ],
  },
  {
    heading: '3. Account Deletion',
    paragraphs: [
      'You may delete your Cenaiva account at any time directly within the app by navigating to Profile → Privacy → Delete Account. You may also request account deletion by contacting us at help@cenaiva.com.',
      'Upon deletion:',
      '• Your account and personal profile information will be permanently removed from our active systems',
      '• Any unused wallet balance will be handled in accordance with applicable law and Section 11.3 (Refunds and Cancellations) prior to deletion — we recommend withdrawing or using any remaining balance before initiating deletion',
      '• Any unredeemed rewards, loyalty points, or Snap rewards are forfeited upon deletion and cannot be recovered',
      '• Saved payment methods (tokenized references stored by Stripe) will be detached from your account',
      '• Account deletion is irreversible. Once deleted, your account, booking history, conversation history, and associated data cannot be restored',
      'Certain data may be retained for a limited period following deletion where required by law, including for tax, financial record-keeping, fraud prevention, or legal compliance purposes. Such retained data will not be used for any other purpose and will be deleted once the applicable retention period expires. Anonymized or aggregated data derived from your usage may be retained indefinitely as it cannot be used to identify you.',
    ],
  },
  {
    heading: '4. Reservations, Bookings, and Reservation Holds',
    paragraphs: [
      '4.1 How Bookings Work. Cenaiva allows users to browse restaurants and make reservation requests through the platform. Reservations are requests and are subject to confirmation by the restaurant. You are responsible for arriving on time and honouring your reservation. Repeated no-shows or cancellations without reasonable notice may result in account restrictions or suspension.',
      'Cenaiva is a technology platform connecting diners with restaurants and is not a party to any agreement between you and a restaurant. Restaurants listed on Cenaiva operate independently under their own Restaurant Partner Agreement. Any disputes regarding dining experiences, service, or food quality should be directed to the restaurant directly.',
      '4.2 Reservation Holds (Cart System). To secure your preferred time slot during the booking process, Cenaiva temporarily reserves ("holds") your selected slot for a limited period while you complete your booking details and any required payment. During this hold period:',
      '• The slot is reserved exclusively for you and is unavailable to other users',
      '• A Stripe payment intent may be created to facilitate any required deposit',
      '• If you do not complete your booking before the hold expires, the hold is automatically released and the slot becomes available to others — no charge is made',
      '• Completing the booking converts the hold into a confirmed reservation',
      'Cenaiva is not liable for a slot becoming unavailable if your hold expires before you complete the booking.',
      '4.3 Availability Alerts. Cenaiva allows you to sign up for availability alerts for specific restaurants, dates, party sizes, or time windows. If availability opens that matches your criteria, we will notify you via push notification. Availability alerts expire automatically once the requested date has passed, do not guarantee that availability will open, and can be cancelled at any time in the app.',
      '4.4 Group Deposit Invitations. For certain bookings requiring a deposit, Cenaiva may allow the booking organizer to invite other members of their party to contribute to the deposit payment. When deposit invitations are sent:',
      '• Invited guests receive a secure link to contribute their portion of the deposit',
      "• Each participant's contribution is processed independently through Stripe",
      '• You are responsible for ensuring that any phone numbers or email addresses you provide for invitations belong to the intended recipients',
      '• Cenaiva is not responsible for uncollected deposit contributions from invited guests',
      '4.5 AI-Assisted Risk Scoring. Cenaiva uses automated systems to calculate a no-show risk score for reservations based on your historical booking behaviour on the platform. This score is visible to restaurant partners and may be used by them to make decisions about your reservation, including whether to require a deposit. Cenaiva does not use this score to deny access to the platform. If you believe your score is inaccurate, you may contact us at privacy@cenaiva.com.',
    ],
  },
  {
    heading: '5. Restaurant Responsibility and Food Safety',
    paragraphs: [
      'Restaurants listed on Cenaiva are independent businesses solely responsible for:',
      '• Food preparation, safety, allergen management, and ingredient accuracy',
      '• Menu content, pricing, and availability',
      '• Service quality, wait times, and seating',
      '• Honouring bookings, deposits, and pre-orders',
      '• Cancellations or changes to reservation availability',
      'Cenaiva may display menu items, ingredients, dietary labels, allergen information, or other restaurant-provided content. Cenaiva does not verify or guarantee the accuracy of this information. Users with allergies, dietary restrictions, or specific health requirements must confirm all relevant details directly with the restaurant before ordering or consuming any food or beverage. Reliance on information displayed in the app without independent confirmation is at your own risk.',
      'Cenaiva is strictly a technology intermediary. We are not a party to any transaction between you and a restaurant, and we bear no responsibility for anything that occurs at or in connection with a restaurant venue, including cancellations, service failures, food quality, allergen incidents, or pricing disputes.',
      'Note: Allergy incident reports submitted through the platform are logged for restaurant record-keeping purposes only and are not a substitute for emergency medical care. If you experience a medical emergency, call 911 immediately.',
    ],
  },
  {
    heading: '6. Cenaiva AI — Voice Agent and Chat Features',
    paragraphs: [
      '6.1 How It Works. Cenaiva offers an AI-powered assistant ("Cenaiva AI") that allows you to discover restaurants, make reservations, join waitlists, and interact with the platform through natural voice conversation and text chat. Cenaiva AI uses third-party artificial intelligence and voice services, including OpenAI (language processing), ElevenLabs (text-to-speech), and Deepgram (speech-to-text), or your device\'s built-in speech recognition processed by Apple or Google in accordance with their respective privacy policies.',
      'When you use Cenaiva AI:',
      "• Your voice input is captured via your device's microphone",
      '• Your speech is transcribed to text and sent to our AI processing services',
      '• Voice recordings, transcripts, and chat messages are stored while your account is active so you can review past conversations; up to 90 days of additional safety review applies for sampled material, after which it is deleted or anonymized. All voice and chat data is deleted upon account deletion or upon your verified request',
      '• Responses are generated by AI and delivered as synthesized voice or text',
      '• Some AI providers process your data outside Canada, including in the United States — see Section 18 for details',
      'By using voice features, you consent to the capture, transcription, processing, and storage of your voice interactions as described above. An in-app notice will be displayed before your first voice interaction confirming this consent. You may select your preferred AI voice in app settings. Users may change their preferred language in app settings.',
      '6.2 AI Accuracy, Hallucinations, and Limitations. Cenaiva AI can and does make mistakes. AI systems — including ours — can produce incorrect, incomplete, or entirely fabricated outputs, commonly referred to as "hallucinations." You acknowledge and agree that:',
      '• AI-generated responses may contain errors, omissions, or factually incorrect information — including incorrect restaurant details, availability, pricing, hours, or menu content',
      '• You should always verify any booking, restaurant detail, or reservation confirmation directly in the app or with the restaurant before relying on it',
      '• Reservations, waitlist entries, or other actions taken through Cenaiva AI are subject to the same confirmation and availability requirements as manual bookings',
      '• Cenaiva is not liable for any losses or inconveniences arising from AI errors, hallucinated information, misunderstood instructions, or automated actions taken on your behalf',
      '• AI-generated menu suggestions, dietary information, or allergen details are not verified by Cenaiva and must always be confirmed directly with the restaurant',
      '6.3 AI Quality Monitoring. Cenaiva monitors the quality of AI responses to improve the platform. A sample of AI conversations may be scored and reviewed by automated systems or Cenaiva staff for accuracy, safety, and compliance with our policies. This review is used solely for service improvement and is governed by our Privacy Policy.',
      '6.4 AI Auto-Tagging and Guest Profiling. Cenaiva uses automated AI systems to analyse your booking history, preferences, and behaviour to generate guest tags and a lifetime value score. These are used to personalize your experience and are visible to restaurant partners when you make a reservation at their venue. Tags reflect general behavioural categories only (for example, "frequent diner") and do not include sensitive personal characteristics. You may contact us at privacy@cenaiva.com to request a review or correction of automated profiling associated with your account.',
      '6.5 Voice Data Deletion. You may request deletion of your stored voice recordings and transcripts at any time by contacting us at privacy@cenaiva.com. Requests will be processed within 30 days. Deletion of voice data does not delete your account or booking history.',
      '6.6 Receipt and Photo Scanning. Cenaiva may allow you to scan receipts or photos using your device camera. Images submitted for scanning are processed via AI vision services. By submitting an image, you confirm you have the right to share it and consent to its processing.',
    ],
  },
  {
    heading: '7. Post-Visit Features — Photos, Reviews, and Surveys',
    paragraphs: [
      '7.1 Post-Visit Photo Prompts. After a completed dining session, Cenaiva may send you a push notification or in-app prompt inviting you to share a photo or review from your visit. These prompts are optional and can be disabled in your notification settings.',
      '7.2 Visit Photos and Story Filters. Cenaiva allows you to upload photos from your dining visits, optionally enhanced with in-app story filters. By uploading a visit photo:',
      "• Your image is stored on Cenaiva's servers and associated with your reservation record",
      '• You grant Cenaiva a non-exclusive, royalty-free licence to display the photo in connection with your account and, where you choose to share it publicly, on the platform',
      '• You confirm you have the right to share the image and, where it features other people, that you have obtained any necessary consent',
      '• Story filter metadata (filter type and timestamp) is stored alongside the image',
      "7.3 Restaurant Reviews. After a completed visit, you may be prompted to leave a star rating and written review. Reviews are shared with the restaurant and may be displayed on the restaurant's Cenaiva profile. Cenaiva reserves the right to remove reviews that violate Section 13 (User Conduct) or that we reasonably believe are false, misleading, or submitted in bad faith.",
      '7.4 Surveys. Cenaiva may invite you to complete optional in-app surveys about your dining experience. Survey responses are used for service improvement. Participation is entirely voluntary.',
    ],
  },
  {
    heading: '8. Social Content and Snap Rewards',
    paragraphs: [
      '8.1 Social Posts and Snaps. Cenaiva allows you to create and share social content ("Snaps") including photos, captions, and dining moments. When you submit a Snap:',
      "• Your content is stored on Cenaiva's servers",
      "• You grant Cenaiva a non-exclusive, worldwide, royalty-free, sublicensable licence to display, reproduce, and promote your Snap within the platform and in connection with Cenaiva's marketing and promotional activities, for so long as the Snap remains on the platform plus a reasonable period thereafter for backup and archival purposes",
      '• You represent that you own or have the right to share any content you submit, including photos featuring other people',
      '• You may not submit content that is defamatory, obscene, misleading, hateful, violates the privacy of others, or that infringes the rights of any third party',
      "When you share a Snap to third-party platforms such as Instagram, TikTok, Snapchat, or YouTube, those platforms' terms of service govern your content once it leaves Cenaiva. We are not responsible for how third-party platforms handle, display, or distribute your content.",
      '8.2 Content Moderation and Removal. Cenaiva may remove, restrict, or refuse any content at its sole discretion, with or without notice, where we determine that content violates these Terms, is inappropriate, misleading, unsafe, potentially unlawful, or infringes the rights of any third party. Users may request removal of their own content at any time by contacting legal@cenaiva.com.',
      '8.3 Intellectual Property Complaints. If you believe that content on Cenaiva infringes your copyright, violates your privacy rights, or is otherwise unlawful, submit a complaint to legal@cenaiva.com. Your complaint must include: your full name and contact information; identification of the content at issue and its location within the app; a description of the right you claim is being infringed; a statement of good faith belief that the use is not authorized; and a statement that the information in your notice is accurate. Upon receipt of a valid complaint, Cenaiva will review the content and may remove it, notify the posting user, and take further action as appropriate.',
      "8.4 Snap Rewards. Cenaiva may award rewards, points, or credits for completing Snaps or other in-app activities. Rewards are granted at Cenaiva's sole discretion and subject to verification of the underlying activity. Rewards have no cash value unless explicitly stated otherwise. Submitting false, duplicate, or fabricated content to earn rewards constitutes abuse and may result in forfeiture of all rewards and account suspension. Rewards are non-transferable and may not be combined with other offers unless specified.",
    ],
  },
  {
    heading: '9. Loyalty Program, Referrals, and Waitlist',
    paragraphs: [
      '9.1 Loyalty Tiers. Cenaiva offers a loyalty program with tiered benefits based on activity. Tier status, benefits, and qualification criteria are set by Cenaiva and may be updated from time to time with reasonable notice. Tier status is non-transferable and has no monetary value.',
      '9.2 Loyalty Waitlist. Certain loyalty program features may be in limited release. If a feature is not yet available to your account, you may join a waitlist. Joining the waitlist does not guarantee access. Cenaiva will notify you via email if and when access becomes available.',
      '9.3 Referrals. Cenaiva may offer referral incentives for inviting new users. Both the referring user and the referred user must meet eligibility requirements. Referred users must be genuinely new to the platform. Referral abuse — including the creation of fake accounts or self-referrals — will result in forfeiture of rewards and may result in account termination. Cenaiva reserves the right to modify or discontinue the referral program at any time.',
    ],
  },
  {
    heading: '10. Wallet (Prepaid Balance)',
    paragraphs: [
      'Cenaiva may offer a digital wallet feature that allows you to maintain a prepaid balance for use within the platform. Wallet balances:',
      '• May be loaded via Stripe-processed payments',
      '• Are non-transferable between accounts',
      '• Are not redeemable for cash unless required by applicable law',
      '• Do not expire and are handled in accordance with applicable provincial gift-card and prepaid balance legislation, including the laws of Ontario, British Columbia, and Quebec where applicable',
      'If your account is terminated for a violation of these Terms, we may restrict access to wallet features while we investigate. If your account is terminated by Cenaiva without cause, we will make reasonable efforts to refund any unused prepaid balance. We are not responsible for unauthorized use of your wallet balance where your account credentials are compromised due to your own negligence.',
    ],
  },
  {
    heading: '11. Payments, Gift Cards, Events, and Refunds',
    paragraphs: [
      '11.1 Pricing Transparency. Cenaiva will display all applicable charges — including platform fees, per-booking fees, pre-order fees, deposits, service fees, and restaurant-specific charges — before checkout. You will have an opportunity to review and confirm the total amount, including applicable taxes (GST/HST/QST/PST as indicated at checkout), before completing any payment. We do not add mandatory fees after you have confirmed your order.',
      "11.2 Payment Processing and Saved Cards. All payments are processed securely through Stripe. By making a payment, you agree to Stripe's Terms of Service.",
      'When you save a payment method in Cenaiva:',
      '• Your card is tokenized and securely stored by Stripe — Cenaiva stores only a tokenized reference, your card brand, the last 4 digits of your card number, and the expiry month and year',
      '• Cenaiva never stores your full card number, CVV, or any other sensitive card data on our servers — this information never touches our systems',
      '• Your full payment card information is handled entirely by Stripe',
      "Cenaiva is the merchant of record for all charges processed through the Platform. Cenaiva may earn a platform fee on transactions as disclosed at checkout. Cenaiva is not liable for any issues arising from Stripe's systems — any concerns about payment processing should be raised with us at help@cenaiva.com and we will investigate promptly.",
      '11.3 Refunds and Cancellations. Refunds for restaurant-specific charges (deposits, pre-orders, event tickets) are subject to that restaurant\'s refund policy, which will be displayed at the time of booking where applicable. Cenaiva platform fees are non-refundable except where required by applicable law or where the booking failure is due to a verified technical error on our part. In the event of a restaurant cancellation, Cenaiva will make reasonable efforts to facilitate a refund of any pre-paid amounts processed through the platform. For duplicate charges or verified failed transactions, contact help@cenaiva.com and we will investigate and resolve within 5 business days. Wallet top-ups are non-refundable except as required by applicable law.',
      '11.4 Gift Cards. Cenaiva may offer digital gift cards for use within the platform. Gift cards are issued with a set initial value and can be applied at checkout. They are non-transferable, cannot be redeemed for cash unless required by applicable law, and cannot be replaced if lost or stolen — treat gift card codes as you would cash. Gift cards may have expiry dates as indicated at the time of purchase.',
      '11.5 Events and Ticketing. Cenaiva may allow restaurants to list events and sell tickets through the platform. When you purchase an event ticket:',
      "• Payment is processed through Stripe and subject to the event's specific refund and cancellation policy, displayed at checkout",
      '• Tickets are linked to your Cenaiva account and cannot be transferred unless the event specifically permits it',
      '• Cenaiva is not responsible for event cancellation, changes to event details, or failure by the restaurant to deliver the event as described — such disputes must be directed to the restaurant directly',
      '• Cenaiva will make reasonable efforts to facilitate refunds where an event is cancelled by the restaurant',
      '11.6 Chargebacks. In the event of a disputed charge, please contact us at help@cenaiva.com before initiating a chargeback. Chargebacks initiated in bad faith, without prior contact, may result in account suspension.',
    ],
  },
  {
    heading: '12. Restaurant Communications and Guest Data Sharing',
    paragraphs: [
      'By making a reservation or becoming a guest at a restaurant through Cenaiva, certain information about you — including your name, contact details, dining preferences, allergy information, visit history, and AI-generated tags associated with your account — is shared with that restaurant. Restaurants may use this information to:',
      '• Manage your reservations and dining experience',
      '• Send you birthday or anniversary messages if you have provided relevant dates and opted in to communications from that restaurant',
      "• Send you targeted marketing messages through Cenaiva's platform, subject to your notification preferences",
      'You may manage your communication preferences with individual restaurants in the app. Opting out of marketing communications from a restaurant does not affect transactional messages related to your active reservations with that restaurant.',
      'Cenaiva does not sell your personal information to restaurants or third parties. Data shared with restaurants through the platform is used solely to facilitate your dining experience and communications as described above.',
    ],
  },
  {
    heading: '13. User Conduct',
    paragraphs: [
      'You agree not to use the Services to:',
      '• Engage in unlawful, fraudulent, or deceptive activity',
      '• Interfere with or disrupt the security or operation of the Services',
      '• Abuse, harass, threaten, or harm other users or restaurant partners',
      '• Post false, misleading, defamatory, or infringing content, including reviews',
      '• Submit fabricated Snaps, fake bookings, or manipulate rewards or referral systems',
      '• Interact with Cenaiva AI in a manner intended to manipulate, deceive, or extract harmful outputs from the system',
      '• Attempt to gain unauthorized access to any part of the platform, servers, or databases',
      '• Scrape, copy, or reverse-engineer any part of the Services',
      '• Use automated tools, bots, or scripts to interact with the platform',
      '• Impersonate any person or entity or misrepresent your affiliation with any person or entity',
      '• Manipulate the reservation hold system to block availability without genuine intent to book',
      'Violation of these conduct standards may result in immediate account suspension or termination without notice, forfeiture of earned rewards, and restriction of wallet access while we investigate. Any unused wallet balance will be handled in accordance with applicable law and Section 11.3.',
    ],
  },
  {
    heading: '14. Account Security and Device Monitoring',
    paragraphs: [
      'To protect you from unauthorized access, Cenaiva:',
      '• Records sign-in events including device fingerprint, platform, app version, and sign-in time',
      '• Sends a security alert via push notification or email when we detect a sign-in from a new or unrecognized device',
      '• May temporarily lock your account following multiple failed sign-in attempts',
      'You are responsible for maintaining the security of your credentials. If you receive a new device sign-in alert that you do not recognize, contact us immediately at help@cenaiva.com.',
      'Cenaiva maintains a comprehensive audit log of actions taken within the platform for security, fraud prevention, and compliance purposes. This log is not used for any purpose beyond security and legal compliance.',
      "Vulnerability disclosure. If you believe you have discovered a security vulnerability in the Services, please report it in good faith to security@cenaiva.com. Cenaiva will not pursue legal action against good-faith security researchers who report vulnerabilities responsibly and do not access or modify other users' data.",
    ],
  },
  {
    heading: '15. Device Permissions and Data Collection',
    paragraphs: [
      'To provide the full Cenaiva experience, the app may request access to:',
      '• Microphone and Speech Recognition — required for the Cenaiva AI voice agent',
      '• Camera and Photo Library — required for Snaps, visit photos, and receipt scanning',
      '• Location (when-in-use only) — used to surface nearby restaurants and provide mapping features. Cenaiva does not access your location in the background',
      '• Push Notifications — used to send booking confirmations, reminders, availability alerts, security alerts, and post-visit prompts. You may disable these at any time in your device settings',
      'You may revoke any permission at any time through your device settings. Revoking certain permissions may limit the functionality of the Services.',
      'Cenaiva also collects crash and error data — including device platform, app version, current screen, and error details — to diagnose and fix technical issues. This data is associated with your user account where available and handled in accordance with our Privacy Policy.',
    ],
  },
  {
    heading: '16. SMS Communications',
    paragraphs: [
      'Cenaiva uses SMS (powered by Twilio) solely for transactional purposes, including booking confirmations, one-time passcodes, waitlist notifications, and service alerts directly related to your use of the platform. By providing your phone number, you consent to receive these transactional messages. Standard messaging and data rates may apply.',
      'We do not send promotional or marketing SMS messages without your separate express consent. You may opt out of transactional SMS at any time by replying STOP to any message, using your in-app notification settings, or contacting us at help@cenaiva.com. Reply HELP for assistance. If you opt out of transactional SMS, some account, booking, security, or verification features may not function properly.',
    ],
  },
  {
    heading: '17. Push Notifications',
    paragraphs: [
      'Cenaiva uses Expo Notifications to deliver push notifications to your device. By enabling notifications, you consent to receiving alerts related to your bookings, rewards, availability alerts, platform activity, post-visit prompts, and account security. You may disable push notifications at any time through your device settings or in-app notification preferences, though this may affect your ability to receive time-sensitive booking updates and security alerts.',
    ],
  },
  {
    heading: '18. Cross-Border Data Transfers',
    paragraphs: [
      'Some third-party providers used by Cenaiva process personal data outside of Canada, including in the United States. This includes OpenAI, ElevenLabs, Deepgram, Stripe, PostHog, Sentry, and Vercel. By using the Services — and in particular the AI voice and chat features — you consent to the transfer of your data to these jurisdictions. Data transferred outside Canada may be subject to the laws of the receiving country, which may differ from Canadian privacy law. We require all third-party providers to maintain appropriate safeguards for your personal information.',
    ],
  },
  {
    heading: '19. Your Data Rights',
    paragraphs: [
      'Depending on where you live and the laws that apply to you, including PIPEDA and Quebec Law 25 where applicable, you may have the right to:',
      '• Access the personal information we hold about you',
      '• Correct inaccurate or incomplete information',
      '• Request portability of your personal data in a structured, commonly used format, where required by applicable law',
      '• Withdraw consent for certain types of data processing, subject to legal and contractual limitations',
      '• Request review or correction of automated profiling associated with your account, including AI-generated tags, no-show risk scores, and lifetime value scores',
      '• Request deletion of your account and personal data, as described in Section 3',
      'To exercise any of these rights, contact us at privacy@cenaiva.com. We will respond within 30 days. We may need to verify your identity before processing a request.',
      'Data Breach Notification. If we become aware of a breach of security safeguards involving your personal information, we will assess the incident in accordance with applicable privacy laws. Where the incident creates a real risk of significant harm, Cenaiva will notify affected users and applicable regulators without unreasonable delay, and in any event within 72 hours of becoming aware of the breach.',
    ],
  },
  {
    heading: '20. Third-Party Services',
    paragraphs: [
      'Cenaiva relies on trusted third-party providers to deliver the Services. Your use of Cenaiva may involve data being processed by:',
      '• Supabase — Database infrastructure and authentication',
      '• Stripe — Payment processing and saved payment methods',
      '• OpenAI — AI language processing for Cenaiva AI',
      '• ElevenLabs — Text-to-speech voice synthesis',
      '• Deepgram — Speech-to-text transcription',
      '• Apple and Google — Device speech recognition, mobile operating system services, and app platform services',
      '• Google Maps Platform — Location and mapping features',
      '• Twilio — SMS communications',
      '• Resend — Transactional email communications',
      '• Expo (EAS) — Mobile app delivery and push notifications',
      '• PostHog — Product analytics and usage insights',
      '• Sentry — Error monitoring and crash reporting',
      '• Vercel — Web infrastructure and hosting',
      'We are not responsible for the performance, availability, or independent data practices of these providers. We encourage you to review their terms and privacy policies.',
    ],
  },
  {
    heading: '21. Analytics and Error Monitoring',
    paragraphs: [
      'We use PostHog to collect product usage data, which may include device information, session data, event data, and usage patterns. Where possible, we use aggregated, pseudonymized, or anonymized data. We use Sentry to monitor application errors and crashes. Data collected through these tools is used solely for service improvement.',
    ],
  },
  {
    heading: '22. AI Usage Limits and Rate Limiting',
    paragraphs: [
      'To ensure fair access to Cenaiva AI features for all users and to manage platform costs, Cenaiva may apply usage limits or rate limits on AI-powered features. If you reach a usage limit, you will be notified in the app and may need to wait before using AI features again. Cenaiva reserves the right to adjust usage limits at any time. Excessive or automated use of AI features beyond normal usage patterns may result in temporary throttling or account review.',
    ],
  },
  {
    heading: '23. App Store Terms (Apple and Google)',
    paragraphs: [
      '• These Terms are between you and Cenaiva only, not Apple Inc. or Google LLC ("App Store Providers")',
      '• App Store Providers have no obligation to provide maintenance, support, warranty, or other services with respect to Cenaiva',
      '• App Store Providers are not responsible for any claims by you or any third party relating to Cenaiva or your use of it',
      '• Apple is a third-party beneficiary of these Terms and, upon your acceptance, will have the right to enforce these Terms against you as a third-party beneficiary',
      '• Your use of Cenaiva must comply with the applicable App Store Terms of Service',
      '• You represent and warrant that you are not located in a country subject to a Canadian, US, or applicable government embargo, and that you are not listed on any government list of prohibited or restricted parties',
      '• In the event of a third-party claim that Cenaiva infringes intellectual property rights, Cenaiva — not Apple or Google — will be solely responsible for the investigation, defence, settlement, and discharge of any such claim',
    ],
  },
  {
    heading: '24. Privacy',
    paragraphs: [
      'Your use of Cenaiva is also governed by our Privacy Policy, available at cenaiva.com/privacy, which is incorporated into these Terms by reference. The Privacy Policy explains how we collect, use, store, and protect your personal information, including voice recordings, chat messages, photos, location data, device identifiers, and automated profiling data.',
    ],
  },
  {
    heading: '25. Intellectual Property',
    paragraphs: [
      'All content, design, branding, software, features, and materials associated with Cenaiva are owned by us or our licensors and are protected by applicable Canadian and international intellectual property laws. You may not copy, reproduce, modify, distribute, reverse-engineer, decompile, or create derivative works from any part of the Services. User-generated content (such as Snaps and visit photos) remains your property, subject to the licences granted in Sections 7.2 and 8.1.',
    ],
  },
  {
    heading: '26. Service Availability',
    paragraphs: [
      'We aim to provide a reliable and uninterrupted experience. However, we do not guarantee that the Services will be available at all times or free from errors. We may perform scheduled or emergency maintenance that temporarily affects access and will endeavour to provide advance notice where reasonably possible. We reserve the right to modify, suspend, or discontinue any part of the Services at any time.',
    ],
  },
  {
    heading: '27. Disclaimer of Warranties',
    paragraphs: [
      'The Services are provided "as is" and "as available" without warranties of any kind, either express or implied. To the fullest extent permitted by applicable law, Cenaiva expressly disclaims all warranties including: implied warranties of merchantability or fitness for a particular purpose; warranties that the Services will be uninterrupted, error-free, or secure; warranties regarding the accuracy, completeness, or reliability of any content, including AI-generated content, restaurant-provided information, and automated scoring or tagging; and warranties that any reservation, hold, booking, or AI-initiated action will be fulfilled as expected.',
    ],
  },
  {
    heading: '28. Limitation of Liability',
    paragraphs: [
      'To the fullest extent permitted by applicable law:',
      '• Cenaiva is not liable for any indirect, incidental, special, punitive, or consequential damages arising from your use of the Services',
      '• We are not responsible for any issues related to restaurant services, including cancellations, food quality, allergens, or disputes between you and a restaurant — Cenaiva is a technology intermediary only and is not a party to any transaction with a restaurant',
      '• We are not liable for losses arising from errors, hallucinations, inaccuracies, or failures of the Cenaiva AI assistant, including incorrect bookings, misunderstood instructions, or fabricated information',
      '• We are not liable for losses arising from unauthorized access to your account where such access results from your own failure to secure your credentials',
      '• We are not liable for expired reservation holds resulting in lost availability',
      '• We are not liable for failures of third-party providers, including Stripe, OpenAI, ElevenLabs, Deepgram, or Twilio',
      '• Our total liability to you for any claim arising out of or relating to these Terms or the Services shall not exceed the greater of CAD $100 or the total amount you paid to Cenaiva in the 12 months prior to the event giving rise to the claim',
      'Nothing in these Terms limits liability that cannot be excluded under applicable Canadian law, including liability for gross negligence or wilful misconduct. If you are a resident of Quebec, nothing in these Terms limits any rights you have under the Quebec Consumer Protection Act.',
    ],
  },
  {
    heading: '29. Indemnification',
    paragraphs: [
      'You agree to indemnify, defend, and hold harmless Cenaiva, its officers, employees, contractors, and partners from and against any claims, liabilities, damages, losses, or expenses (including reasonable legal fees) arising from: your use of or inability to use the Services; your violation of these Terms; your interactions with restaurants or other users; any content or information you submit through the platform, including Snaps, voice interactions, and photos; and your violation of any third-party rights.',
    ],
  },
  {
    heading: '30. Dispute Resolution',
    paragraphs: [
      'We encourage you to contact us first at help@cenaiva.com to resolve any concerns informally. We will make a genuine effort to respond to and resolve disputes within 30 days. If a dispute cannot be resolved informally, both parties agree to submit to the exclusive jurisdiction of the courts of the Province of Ontario, and to attempt in good faith to resolve the matter through mediation before initiating formal legal proceedings. If you are a resident of Quebec, you retain the right to bring proceedings before the courts of Quebec in accordance with applicable law.',
    ],
  },
  {
    heading: '31. Force Majeure',
    paragraphs: [
      'Cenaiva is not liable for any delay or failure to perform resulting from causes beyond our reasonable control, including internet or network outages; third-party service failures (including AI providers, payment processors, and infrastructure providers); natural disasters; acts of government; pandemics; or other events outside our reasonable control.',
    ],
  },
  {
    heading: '32. Termination',
    paragraphs: [
      'We may suspend or terminate your access to Cenaiva at any time, with or without notice, if you violate any provision of these Terms, misuse the platform, harm other users or restaurant partners, or engage in conduct that exposes Cenaiva to legal risk or reputational harm. Upon termination, your right to use the Services ceases immediately. Wallet balances following termination are handled as described in Section 11.3. The following sections survive termination: 3, 8.1, 10, 11.3, 13, 17, 18, 19, 24, 25, 27, 28, 29, 30, 33–39.',
    ],
  },
  {
    heading: '33. Changes to These Terms',
    paragraphs: [
      'We may update these Terms from time to time. For minor changes, we will update the "Last Updated" date at the top of this document. For material changes, we will provide at least 30 days\' notice via email or in-app notification before the changes take effect. Your continued use of the Services after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree, you must stop using the Services.',
    ],
  },
  {
    heading: '34. Governing Law',
    paragraphs: [
      'These Terms are governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of law principles.',
    ],
  },
  {
    heading: '35. Language / Langue',
    paragraphs: [
      'Cenaiva is available in both English and French. These Terms, our Privacy Policy, checkout disclosures, account notices, and other consumer-facing legal documents are made available in both English and French where required by applicable law.',
      'For users located in Quebec, the French version of these Terms will be made available first, at no cost, before the user chooses to be bound by the English version. A Quebec user may choose to use the English version only after having been given access to the French version and clearly expressing their wish to proceed in English. In the event of any conflict between the English and French versions, the interpretation most favourable to the consumer will prevail where required by law.',
      "Cenaiva est disponible en anglais et en français. Les présentes conditions et autres documents juridiques destinés aux consommateurs sont disponibles en anglais et en français lorsque la loi applicable l'exige. Pour les utilisateurs situés au Québec, la version française sera mise à disposition en premier, sans frais. En cas de conflit entre les versions, l'interprétation la plus favorable au consommateur prévaudra, lorsque la loi l'exige.",
    ],
  },
  {
    heading: '36. Severability',
    paragraphs: [
      'If any provision of these Terms is found to be unlawful, void, or unenforceable under applicable law, that provision will be deemed severed from these Terms and will not affect the validity and enforceability of the remaining provisions.',
    ],
  },
  {
    heading: '37. Assignment',
    paragraphs: [
      'We may assign or transfer these Terms in connection with a merger, acquisition, reorganization, or sale of all or substantially all of our assets, without notice to you. You may not assign or transfer your rights or obligations under these Terms without our prior written consent.',
    ],
  },
  {
    heading: '38. Waiver',
    paragraphs: [
      'Our failure to enforce any provision of these Terms on any occasion does not constitute a waiver of our right to enforce that provision or any other provision in the future.',
    ],
  },
  {
    heading: '39. Entire Agreement',
    paragraphs: [
      'These Terms, together with our Privacy Policy (cenaiva.com/privacy) and, where applicable, the Restaurant Partner Agreement, constitute the entire agreement between you and Cenaiva with respect to your use of the Services as a consumer and supersede all prior agreements, representations, or understandings relating to the same subject matter. Section headings are included for convenience only and have no interpretive effect.',
    ],
  },
  {
    heading: '40. Contact',
    paragraphs: [
      '• General Support: help@cenaiva.com',
      '• Privacy Inquiries: privacy@cenaiva.com',
      '• Legal / IP Complaints: legal@cenaiva.com',
      '• Security Vulnerability Reports: security@cenaiva.com',
      '• Website: cenaiva.com/terms',
      'Support is available in English and French. Le soutien est offert en anglais et en français.',
    ],
  },
];
