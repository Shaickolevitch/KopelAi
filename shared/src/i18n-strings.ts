/**
 * Shared i18n strings between mobile and web.
 * Pure data - no React, no platform code. Each app wraps these in its
 * own Provider/Context with its own RTL handling.
 */

export type Language = 'he' | 'en';

export const STORAGE_KEY = 'kopelai.uiLanguage';

export const STRINGS = {
  he: {
    tab_conversation: 'שיחה',
    tab_insights: 'תובנות',
    tab_settings: 'הגדרות',
    tab_analysis: 'ניתוח',
    tab_lectures: 'הרצאות',
    tab_about_us: 'מי אנחנו',
    tab_plan: 'מנוי',
    tab_invite: 'הזמנת חברים',
    tab_tree: 'העץ שלי',
    tab_admin: 'אדמין',

    conversation_empty_hint: "אני 'קופלAI', מהות וירטואלית.\nמטרתי לעזור למטפלים ולאנשים המתעניינים בפסיכואנליזה להרחיב את יכולת החשיבה שלהם.\nספר לי מה עולה בדעתך.",
    conversation_input_placeholder: 'ספר על משהו שעל ליבך',
    conversation_recording: 'מקליט...',
    conversation_transcribing: 'מתמלל...',
    conversation_end_session: 'סיימתי לעכשיו - בוא ננתח',
    conversation_end_session_hint: 'כשבא לך לעצור - לחצו "סיימתי לעכשיו - בוא ננתח", ונראה יחד מה עלה',
    conversation_end_confirm_title: 'לסיים את השיחה?',
    conversation_end_confirm_body: 'אשמור על מה שדיברנו, ובפעם הבאה נמשיך מכאן',
    conversation_end_cancel: 'ביטול',
    conversation_end_confirm: 'סיים',
    conversation_end_failed: 'לא הצלחתי לסיים את השיחה',
    conversation_send_failed: 'לא הצלחתי לשלוח',
    daily_limit_title: 'הגענו לסוף המכסה היומית',
    daily_limit_body: 'דיברנו לא מעט היום, ויפה שכך. בגרסה החינמית אפשר להמשיך מחר - ואם בא לך להישאר עכשיו, בפרו השיחה נמשכת בלי הגבלה.',
    daily_limit_cta_upgrade: 'המשיכו עכשיו עם פרו',
    daily_limit_cta_tomorrow: 'נתראה מחר',
    trial_limit_title: 'הגעתם למכסת 50 ההודעות להיום',
    trial_limit_body: 'בתקופת הניסיון אפשר עד 50 הודעות ביום - והזיכרון והתובנות שלכם נשמרים. נתראה מחר להמשך, או עברו לפרו לשיחות ללא הגבלה.',
    trial_limit_cta_upgrade: 'לפרו - ללא הגבלה',

    mic_permission_title: 'נדרשת גישה למיקרופון',
    mic_permission_body: 'קופלAI משתמש במיקרופון כדי שתוכל לדבר במקום להקליד. אפשר להפעיל בהגדרות.',

    insights_title: 'תובנות',
    insights_stat_conversations: 'שיחות',
    insights_stat_messages: 'הודעות',
    insights_stat_last_activity: 'פעילות אחרונה',
    insights_card_empty: 'קופלAI עוד לומד אותך כאן',
    insights_empty_title: 'הדף הזה מתמלא ככל שאתה מדבר',
    insights_empty_body:
      'תהיה לך שיחה עם קופלAI, ואז תסיים את הסשן. מה שקופלAI שם לב אליו אצלך יופיע כאן - הדפוסים שלך, מה ממלא לך אנרגיה, מה אתה חוזר אליו. כל תובנה תוכל להצביע לרגע שממנו היא נולדה.',
    insights_empty_footer: 'אין מבחן. אין פרופיל למלא. פשוט תדבר, ותן לדף הזה לגדול.',

    time_now: 'עכשיו',
    time_minutes: (n: number) => `לפני ${n} דק׳`,
    time_hours: (n: number) => `לפני ${n} שעות`,
    time_days: (n: number) => `לפני ${n} ימים`,
    time_weeks: (n: number) => `לפני ${n} שבועות`,
    time_months: (n: number) => `לפני ${n} חודשים`,

    settings_title: 'הגדרות',
    settings_language: 'שפה',
    settings_language_hebrew: 'עברית',
    settings_language_english: 'English',

    restart_dialog_title: 'נדרשת הפעלה מחדש',
    restart_dialog_body: 'כדי לשנות את כיוון הטקסט והשפה, האפליקציה צריכה להיפתח מחדש.',
    restart_dialog_cancel: 'ביטול',
    restart_dialog_confirm: 'הפעל מחדש',

    settings_appearance: 'מראה',
    settings_appearance_light: 'בהיר',
    settings_appearance_dark: 'כהה',

    settings_danger_zone: 'אזור מסוכן',
    settings_reset_account: 'איפוס חשבון',
    settings_reset_account_subtitle: 'התחל מחדש עם חשבון ריק',
    settings_reset_dialog_title: 'לאפס את החשבון?',
    settings_reset_dialog_body:
      'זה ימחק את כל השיחות שלך, התובנות, וההיסטוריה. פעולה זו לא ניתנת לביטול. תרצה להמשיך?',
    settings_reset_dialog_cancel: 'ביטול',
    settings_reset_dialog_confirm: 'כן, אפס',
    settings_reset_failed: 'האיפוס נכשל',

    settings_about: 'אודות',
    settings_privacy_policy: 'מדיניות פרטיות',
    settings_terms_of_service: 'תנאי שימוש',
    settings_contact: 'יצירת קשר',

    settings_delete_account: 'מחק את החשבון',
    settings_delete_account_subtitle: 'מחיקה רכה למשך 7 ימים, ואז מחיקה לצמיתות',
    settings_delete_dialog_title: 'למחוק את החשבון?',
    settings_delete_dialog_body:
      'כל השיחות, התובנות וההיסטוריה שלך יימחקו. יהיו לך 7 ימים לבטל את המחיקה אם תתחרט. לאחר מכן, הכל יימחק לצמיתות.',
    settings_delete_dialog_cancel: 'ביטול',
    settings_delete_dialog_confirm: 'כן, מחק',
    settings_delete_failed: 'המחיקה נכשלה',
    settings_deletion_in_progress: 'מוחק...',

    settings_export_data: 'ייצוא הנתונים שלי',
    settings_export_data_subtitle: 'הורד את כל מה שקופלAI שמרה עליך',
    export_in_progress: 'מכין את הנתונים שלך...',
    export_failed: 'הייצוא נכשל',
    export_success_title: 'הנתונים מוכנים',
    export_success_body: 'הקובץ JSON נוצר. בחר איפה לשמור.',
    export_filename_prefix: 'kopelai-export',

    restore_dialog_title: 'ברוך השב',
    restore_dialog_body: (days: number) =>
      `החשבון שלך מתוזמן למחיקה. נותרו ${days} ימים. תרצה לבטל את המחיקה ולשחזר את הנתונים?`,
    restore_dialog_cancel: 'לא, המשך מחיקה',
    restore_dialog_confirm: 'שחזר את החשבון',
    restore_success: 'החשבון שוחזר בהצלחה',
    restore_failed: 'השחזור נכשל',
    deletion_expired_title: 'תקופת השחזור הסתיימה',
    deletion_expired_body:
      'המחיקה של החשבון לא ניתנת עוד לביטול. הנתונים שלך יימחקו לצמיתות בקרוב.',

    auth_welcome_title: 'ברוך הבא לקופלAI',
    auth_welcome_subtitle: 'הירשם כדי לשמור על השיחות והתובנות שלך, או היכנס לחשבון קיים.',
    auth_signup_title: 'יצירת חשבון',
    auth_signin_title: 'כניסה',
    auth_email_label: 'אימייל',
    auth_email_placeholder: 'your@email.com',
    auth_password_label: 'סיסמה',
    auth_password_placeholder: 'לפחות 8 תווים',
    auth_signup_button: 'צור חשבון',
    auth_signin_button: 'היכנס',
    auth_switch_to_signin: 'יש לך כבר חשבון? היכנס',
    auth_switch_to_signup: 'אין לך חשבון? הירשם',
    auth_forgot_password: 'שכחת סיסמה?',
    auth_reset_intro: 'הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה.',
    auth_show_password: 'הצג סיסמה',
    auth_hide_password: 'הסתר סיסמה',
    auth_reset_email_sent: 'שלחנו לך אימייל לאיפוס הסיסמה. בדוק את תיבת הדואר.',
    auth_send_reset_button: 'שלח קישור לאיפוס',
    auth_skip_for_now: 'דלג לעכשיו',
    auth_continue_anonymously: 'נסה קודם בלי חשבון',

    auth_error_invalid_email: 'כתובת אימייל לא תקינה',
    auth_error_short_password: 'הסיסמה צריכה להיות לפחות 8 תווים',
    auth_error_email_in_use: 'אימייל זה כבר רשום במערכת',
    auth_error_wrong_credentials: 'אימייל או סיסמה שגויים',
    auth_error_network: 'בעיית רשת. נסה שוב.',
    auth_error_rate_limit: 'נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות, או היכנס עם Google.',
    auth_error_signups_disabled: 'הרשמה במייל אינה זמינה כרגע. נסה להיכנס עם Google.',
    auth_error_generic: 'משהו השתבש',

    auth_reset_confirm_title: 'הגדרת סיסמה חדשה',
    auth_reset_confirm_subtitle: 'בחר סיסמה חדשה לחשבון שלך',
    auth_reset_confirm_new_password: 'סיסמה חדשה',
    auth_reset_confirm_button: 'עדכן סיסמה',
    auth_reset_confirm_button_loading: 'מעדכן...',
    auth_reset_confirm_success: 'הסיסמה עודכנה בהצלחה',
    auth_reset_confirm_invalid_link: 'הקישור לא תקף או פג תוקפו. בקש קישור חדש.',
    auth_reset_confirm_back_to_signin: 'חזרה להתחברות',
    auth_password_too_short: 'הסיסמה צריכה להיות לפחות 8 תווים',

    save_account_title: 'שמור את החשבון שלך',
    save_account_body: 'יצרת תובנות שכדאי לשמור. הירשם עם אימייל וסיסמה, ותוכל להמשיך מאיפה שעצרת בכל מכשיר.',
    save_account_button: 'שמור את החשבון',
    save_account_skip: 'אולי מאוחר יותר',

    save_prompt_1_title: 'שיחה נחמדה.',
    save_prompt_1_body:
      'כדי לשמור את מה שאתם בונים יחד - צור חשבון. ככה תוכל להמשיך מהמכשיר הזה או מאחר.',
    save_prompt_1_emoji: '😐',

    save_prompt_2_title: 'קופלAI מתחילה ללמוד אותך.',
    save_prompt_2_body:
      'עוד קצת והפרופיל שלך יתחיל לקבל צורה. בלי חשבון - זה רק כאן, על המכשיר הזה. תרצה לשמור את זה כדי שזה יישאר?',
    save_prompt_2_emoji: '😕',

    save_prompt_3_title: 'אתה משקיע פה זמן ומחשבה.',
    save_prompt_3_body:
      'קופלAI כבר מבינה דברים עליך - דפוסים, מה שחשוב לך, מה שחוזר. בלי חשבון, אם תאבד את הטלפון או תאפס את האפליקציה - הכל ייעלם. אנחנו ממליצים לשמור עכשיו.',
    save_prompt_3_emoji: '😔',

    save_prompt_4_title: 'אתה כבר באמת בפנים.',
    save_prompt_4_body:
      'קופלAI מכירה אותך כבר. דפוסים, חוזקות, פחדים, חלומות. כל זה - רק על המכשיר הזה. בלי חשבון, יום אחד זה ייעלם. זה הרגע לשמור את החשבון שלך.',
    save_prompt_4_emoji: '😢',

    save_prompt_5_title: 'בסדר, הבנתי.',
    save_prompt_5_body:
      '160 הודעות בלי חשבון. את עקשן/ית. אני מעריצה את זה. אבל באמת... תשמור כבר את החשבון? בבקשה?',
    save_prompt_5_emoji: '🥺',
    save_prompt_5_dismiss: 'לא תודה, אני מורד/ת',

    save_prompt_save_button: 'שמור את החשבון',
    save_prompt_dismiss_button: 'אולי מאוחר יותר',

    settings_account: 'חשבון',
    settings_save_account: 'שמור את החשבון שלך',
    settings_save_account_subtitle: 'הירשם עם אימייל וסיסמה כדי לשמור את הנתונים שלך',
    settings_signed_in_as: 'מחובר בתור',
    settings_sign_out: 'התנתק',
    settings_sign_out_confirm_title: 'להתנתק?',
    settings_sign_out_confirm_body: 'הנתונים שלך יישמרו, ותוכל להתחבר שוב בכל עת.',
    settings_sign_out_cancel: 'ביטול',
    settings_sign_out_confirm: 'התנתק',

    pro_badge: 'פרו',
    settings_upgrade_title: 'שדרג לקופלAI פרו',
    settings_upgrade_subtitle: 'קופלAI יזכור אותך בין סשנים',
    settings_manage_subscription: 'ניהול מנוי',
    settings_manage_subscription_subtitle: 'ביטול, החלפת כרטיס אשראי ועוד',
    settings_subscription_pro: 'מנוי פעיל - קופלAI פרו',

    pricing_monthly_label: 'חודשי',
    pricing_annual_label: 'שנתי',
    pricing_annual_saving: 'חיסכון של כחודשיים',
    pricing_monthly_price_nis: '₪99 לחודש',
    pricing_annual_price_nis: '₪990 לשנה',
    pricing_monthly_price_usd: '₪99 לחודש',
    pricing_annual_price_usd: '₪990 לשנה',
    pricing_cta: 'שדרג עכשיו',
    pricing_cta_loading: 'מכין את הקופה...',

    upgrade_nudge_title: 'התובנות שלך מוכנות',
    upgrade_nudge_body: 'הן ייעלמו כשתסגור את הלשונית. עם קופלAI פרו, קופלAI יזכור אותך מסשן לסשן.',
    upgrade_nudge_view: 'חזרה להתחלה',
    upgrade_nudge_upgrade: 'שדרג לפרו',

    upgrade_anon_title: 'קודם כל תפתח חשבון',
    upgrade_anon_body: 'כדי לשדרג לפרו, תצטרך להירשם תחילה עם אימייל וסיסמה.',
    upgrade_anon_cta: 'צור חשבון',
    upgrade_anon_cancel: 'אולי מאוחר יותר',

    insights_pro_banner_title: 'התובנות האלה לא יישמרו',
    insights_pro_banner_body: 'משתמשי פרו זוכרים כל סשן. שדרג כדי לשמור על מה שקופלAI למד עליך.',
    insights_pro_banner_cta: 'שדרג לפרו',

    checkout_success_title: 'ברוך הבא לפרו!',
    checkout_success_body: 'מאמת את המנוי שלך...',
    checkout_success_redirect: 'מעביר אותך לתובנות שלך...',
    checkout_success_timeout: 'התשלום התקבל! מנוי הפרו יופעל תוך מספר דקות. אפשר להמשיך בינתיים — הוא ייכנס לתוקף אוטומטית.',
    checkout_success_goto_settings: 'עבור להגדרות',
    checkout_success_continue: 'המשך לקופלAI',

    consent_message: 'אנחנו משתמשים בעוגיות אנליטיקס כדי לשפר את השירות. אפשר לאשר או לסרב.',
    consent_accept: 'אישור',
    consent_decline: 'לא, תודה',
    consent_learn_more: 'מדיניות הפרטיות',

    mobile_upgrade_title: 'שדרג לקופלAI פרו',
    mobile_upgrade_subtitle: 'הירשם באתר כדי להפעיל מנוי',
    mobile_upgrade_cta: 'עבור לאתר',
  },

  en: {
    tab_conversation: 'Conversation',
    tab_insights: 'Insights',
    tab_settings: 'Settings',
    tab_analysis: 'Analysis',
    tab_lectures: 'Lectures',
    tab_about_us: 'Who we are',
    tab_plan: 'Plan',
    tab_invite: 'Invite',
    tab_tree: 'My tree',
    tab_admin: 'Admin',

    conversation_empty_hint: "I'm 'KopelAi', a virtual entity.\nMy purpose is to help therapists and people interested in psychoanalysis expand their capacity to think.\nTell me what comes to mind.",
    conversation_input_placeholder: "Tell me what's on your mind",
    conversation_recording: 'Recording...',
    conversation_transcribing: 'Transcribing...',
    conversation_end_session: "I'm done for now - let's analyze",
    conversation_end_session_hint: 'Whenever you want to stop - tap "I\'m done for now - let\'s analyze" and we\'ll look at what came up together',
    conversation_end_confirm_title: 'End this session?',
    conversation_end_confirm_body:
      "I'll keep what we talked about, and we'll pick up here next time.",
    conversation_end_cancel: 'Cancel',
    conversation_end_confirm: 'End',
    conversation_end_failed: 'Could not end session',
    conversation_send_failed: 'Send failed',
    daily_limit_title: "That's today's free conversation",
    daily_limit_body: "We covered real ground today - and that's a good thing. On the free plan you can pick this back up tomorrow. If you'd rather stay now, Pro keeps the conversation going without limits.",
    daily_limit_cta_upgrade: 'Continue now with Pro',
    daily_limit_cta_tomorrow: 'See you tomorrow',
    trial_limit_title: "That's 50 messages for today",
    trial_limit_body: "Your trial allows up to 50 messages a day - and your memory and insights are saved. Come back tomorrow to continue, or go Pro for unlimited conversations.",
    trial_limit_cta_upgrade: 'Go Pro - unlimited',

    mic_permission_title: 'Microphone access needed',
    mic_permission_body:
      'KopelAi uses the mic so you can speak instead of type. You can enable it in Settings.',

    insights_title: 'Insights',
    insights_stat_conversations: 'Conversations',
    insights_stat_messages: 'Messages',
    insights_stat_last_activity: 'Last activity',
    insights_card_empty: "KopelAi doesn't have enough to say about this yet.",
    insights_empty_title: 'This page fills in as you talk.',
    insights_empty_body:
      "Have a conversation with KopelAi, then end the session. What it notices about you will show up here - your patterns, what energizes you, what you keep coming back to. Each observation will cite the moment it came from.",
    insights_empty_footer:
      "There's no test, no profile to fill in. Just talk, and let this page grow.",

    time_now: 'just now',
    time_minutes: (n: number) => `${n} min ago`,
    time_hours: (n: number) => `${n} hr ago`,
    time_days: (n: number) => `${n} days ago`,
    time_weeks: (n: number) => `${n} weeks ago`,
    time_months: (n: number) => `${n} months ago`,

    settings_title: 'Settings',
    settings_language: 'Language',
    settings_language_hebrew: 'עברית',
    settings_language_english: 'English',

    restart_dialog_title: 'Restart needed',
    restart_dialog_body:
      'To change the text direction and language, the app needs to restart.',
    restart_dialog_cancel: 'Cancel',
    restart_dialog_confirm: 'Restart',

    settings_appearance: 'Appearance',
    settings_appearance_light: 'Light',
    settings_appearance_dark: 'Dark',

    settings_danger_zone: 'Danger zone',
    settings_reset_account: 'Reset account',
    settings_reset_account_subtitle: 'Start fresh with an empty account',
    settings_reset_dialog_title: 'Reset your account?',
    settings_reset_dialog_body:
      'This will delete all your conversations, insights, and history. This cannot be undone. Continue?',
    settings_reset_dialog_cancel: 'Cancel',
    settings_reset_dialog_confirm: 'Yes, reset',
    settings_reset_failed: 'Reset failed',

    settings_about: 'About',
    settings_privacy_policy: 'Privacy Policy',
    settings_terms_of_service: 'Terms of Service',
    settings_contact: 'Contact',

    settings_delete_account: 'Delete account',
    settings_delete_account_subtitle: 'Soft-delete for 7 days, then permanent deletion',
    settings_delete_dialog_title: 'Delete your account?',
    settings_delete_dialog_body:
      'All your conversations, insights, and history will be deleted. You\'ll have 7 days to cancel if you change your mind. After that, everything is permanently removed.',
    settings_delete_dialog_cancel: 'Cancel',
    settings_delete_dialog_confirm: 'Yes, delete',
    settings_delete_failed: 'Deletion failed',
    settings_deletion_in_progress: 'Deleting...',

    restore_dialog_title: 'Welcome back',
    restore_dialog_body: (days: number) =>
      `Your account is scheduled for deletion. ${days} day${days === 1 ? '' : 's'} remaining. Want to cancel the deletion and restore your data?`,
    restore_dialog_cancel: 'No, continue deletion',
    restore_dialog_confirm: 'Restore my account',
    restore_success: 'Account restored',
    restore_failed: 'Restore failed',
    deletion_expired_title: 'Restore window expired',
    deletion_expired_body:
      'The deletion can no longer be undone. Your data will be permanently removed soon.',

    auth_welcome_title: 'Welcome to KopelAi',
    auth_welcome_subtitle: 'Sign up to save your conversations and insights, or sign in to your existing account.',
    auth_signup_title: 'Create account',
    auth_signin_title: 'Sign in',
    auth_email_label: 'Email',
    auth_email_placeholder: 'your@email.com',
    auth_password_label: 'Password',
    auth_password_placeholder: 'At least 8 characters',
    auth_signup_button: 'Create account',
    auth_signin_button: 'Sign in',
    auth_switch_to_signin: 'Already have an account? Sign in',
    auth_switch_to_signup: "Don't have an account? Sign up",
    auth_forgot_password: 'Forgot password?',
    auth_reset_intro: "Enter your email and we'll send you a reset link.",
    auth_show_password: 'Show password',
    auth_hide_password: 'Hide password',
    auth_reset_email_sent: "We've sent you a password reset email. Check your inbox.",
    auth_send_reset_button: 'Send reset link',
    auth_skip_for_now: 'Skip for now',
    auth_continue_anonymously: 'Try without an account first',

    auth_error_invalid_email: 'Invalid email address',
    auth_error_short_password: 'Password must be at least 8 characters',
    auth_error_email_in_use: 'This email is already registered',
    auth_error_wrong_credentials: 'Wrong email or password',
    auth_error_network: 'Network problem. Try again.',
    auth_error_rate_limit: 'Too many attempts. Try again in a few minutes, or sign in with Google.',
    auth_error_signups_disabled: "Email signup isn't available right now. Try Google instead.",
    auth_error_generic: 'Something went wrong',

    auth_reset_confirm_title: 'Set new password',
    auth_reset_confirm_subtitle: 'Choose a new password for your account',
    auth_reset_confirm_new_password: 'New password',
    auth_reset_confirm_button: 'Update password',
    auth_reset_confirm_button_loading: 'Updating...',
    auth_reset_confirm_success: 'Password updated successfully',
    auth_reset_confirm_invalid_link: 'This link is invalid or has expired. Please request a new one.',
    auth_reset_confirm_back_to_signin: 'Back to sign in',
    auth_password_too_short: 'Password must be at least 8 characters',

    save_account_title: 'Save your account',
    save_account_body: "You've created insights worth keeping. Sign up with email and password to continue from any device.",
    save_account_button: 'Save my account',
    save_account_skip: 'Maybe later',

    save_prompt_1_title: 'A nice conversation.',
    save_prompt_1_body:
      "To save what you're building together - create an account. You'll be able to continue from this device or another.",
    save_prompt_1_emoji: '😐',

    save_prompt_2_title: 'KopelAi is starting to learn you.',
    save_prompt_2_body:
      'A bit more and your profile will start taking shape. Without an account, this lives only on this device. Want to save it so it stays?',
    save_prompt_2_emoji: '😕',

    save_prompt_3_title: "You're putting in real time and thought here.",
    save_prompt_3_body:
      'KopelAi already understands things about you - patterns, what matters, what keeps coming back. Without an account, if you lose this phone or reset the app - it all goes. We recommend saving now.',
    save_prompt_3_emoji: '😔',

    save_prompt_4_title: "You're really in this now.",
    save_prompt_4_body:
      'KopelAi knows you already. Patterns, strengths, fears, dreams. All of that - only on this device. Without an account, one day it disappears. This is the moment to save your account.',
    save_prompt_4_emoji: '😢',

    save_prompt_5_title: 'OK, I get it.',
    save_prompt_5_body:
      "160 messages without an account. You're stubborn. I respect that. But really... save the account already? Please?",
    save_prompt_5_emoji: '🥺',
    save_prompt_5_dismiss: "No thanks, I'm rebellious",

    save_prompt_save_button: 'Save my account',
    save_prompt_dismiss_button: 'Maybe later',

    settings_account: 'Account',
    settings_save_account: 'Save your account',
    settings_save_account_subtitle: 'Sign up with email and password to keep your data',
    settings_signed_in_as: 'Signed in as',
    settings_sign_out: 'Sign out',
    settings_sign_out_confirm_title: 'Sign out?',
    settings_sign_out_confirm_body: 'Your data is saved. You can sign back in any time.',
    settings_sign_out_cancel: 'Cancel',
    settings_sign_out_confirm: 'Sign out',

    pro_badge: 'Pro',
    settings_upgrade_title: 'Upgrade to KopelAi Pro',
    settings_upgrade_subtitle: 'KopelAi remembers you across sessions',
    settings_manage_subscription: 'Manage subscription',
    settings_manage_subscription_subtitle: 'Cancel, update payment method, and more',
    settings_subscription_pro: 'Active subscription - KopelAi Pro',

    pricing_monthly_label: 'Monthly',
    pricing_annual_label: 'Annual',
    pricing_annual_saving: '~2 months free',
    pricing_monthly_price_nis: '₪99 / month',
    pricing_annual_price_nis: '₪990 / year',
    pricing_monthly_price_usd: '₪99 / month',
    pricing_annual_price_usd: '₪990 / year',
    pricing_cta: 'Upgrade now',
    pricing_cta_loading: 'Preparing checkout...',

    upgrade_nudge_title: 'Your insights are ready',
    upgrade_nudge_body: "They'll disappear when you close this tab. With KopelAi Pro, KopelAi remembers you across every session.",
    upgrade_nudge_view: 'Back to start',
    upgrade_nudge_upgrade: 'Upgrade to Pro',

    upgrade_anon_title: 'Create an account first',
    upgrade_anon_body: 'To upgrade to Pro you need to register with an email and password.',
    upgrade_anon_cta: 'Create account',
    upgrade_anon_cancel: 'Maybe later',

    insights_pro_banner_title: "These insights won't be saved",
    insights_pro_banner_body: 'Pro users keep every session. Upgrade to preserve what KopelAi has learned about you.',
    insights_pro_banner_cta: 'Upgrade to Pro',

    checkout_success_title: 'Welcome to Pro!',
    checkout_success_body: 'Verifying your subscription…',
    checkout_success_redirect: 'Taking you to your insights…',
    checkout_success_timeout: 'Payment received! Your Pro subscription will activate within a few minutes. You can keep going in the meantime — it will apply automatically.',
    checkout_success_goto_settings: 'Go to settings',
    checkout_success_continue: 'Continue to KopelAi',

    consent_message: 'We use analytics cookies to improve the service. You can accept or decline.',
    consent_accept: 'Accept',
    consent_decline: 'No, thanks',
    consent_learn_more: 'Privacy policy',

    mobile_upgrade_title: 'Upgrade to KopelAi Pro',
    mobile_upgrade_subtitle: 'Subscribe on the website to activate',
    mobile_upgrade_cta: 'Go to website',

    settings_export_data: 'Export my data',
    settings_export_data_subtitle: 'Download everything KopelAi has stored about you',
    export_in_progress: 'Preparing your data...',
    export_failed: 'Export failed',
    export_success_title: 'Your data is ready',
    export_success_body: "JSON file created. Choose where to save it.",
    export_filename_prefix: 'kopelai-export',
  },
};