/*
 * Field registry for the Lab Reactor Trello Power‑Up.
 *
 * This module defines all of the custom fields required by the
 * Sciences En Folie team. It acts as the single source of truth for
 * mapping between our internal keys, the human‑readable names that
 * appear on Trello cards and in the Power‑Up UI, the field types, and
 * any dropdown options. New fields should be added to this list and
 * referenced elsewhere via the `key` property. When the Power‑Up
 * initialises, it uses this registry to create missing custom fields
 * on the board and to map Trello values into a local state object.
 */

export type FieldType = 'text' | 'number' | 'date' | 'checkbox' | 'list';

/**
 * Definition of a single dropdown option. The `id` property will be
 * populated at runtime once Trello returns the identifier for the
 * corresponding option. For list fields without predefined values,
 * leave `options` undefined.
 */
export interface FieldOption {
  /** The Trello‑assigned ID for this option (populated after creation). */
  id?: string;
  /** The label that appears in Trello. */
  value: string;
}

/**
 * Description of a custom field. Each entry corresponds to a unique
 * custom field on the Trello board. The `key` should be stable and
 * used throughout the codebase; `name` is what Trello displays to
 * users; `type` defines the storage type; `options` lists possible
 * values for drop‑down fields; `description` can be surfaced in
 * documentation; and `section` groups fields in the UI.
 */
export interface FieldDefinition {
  key: string;
  name: string;
  type: FieldType;
  options?: FieldOption[];
  description?: string;
  section: string;
}

/**
 * Field registry. This array contains all of the custom fields used by
 * the Lab Reactor. The order in this list determines the order that
 * fields are created when initialising a board. Sections loosely
 * group related fields together for the UI, but the order is not
 * enforced by Trello itself. The names and options are provided in
 * French to match the Sciences En Folie context.
 */
export const fieldRegistry: FieldDefinition[] = [
  // IDENTITÉ
  { key: 'sef_school_name', name: "Nom de l’école", type: 'text', section: 'IDENTITÉ' },
  { key: 'sef_css', name: 'Centre de services scolaire', type: 'text', section: 'IDENTITÉ' },
  { key: 'sef_school_year', name: 'Année scolaire', type: 'text', section: 'IDENTITÉ' },
  { key: 'sef_address', name: 'Adresse', type: 'text', section: 'IDENTITÉ' },
  { key: 'sef_city', name: 'Ville', type: 'text', section: 'IDENTITÉ' },
  { key: 'sef_postal_code', name: 'Code postal', type: 'text', section: 'IDENTITÉ' },
  { key: 'sef_contact_name', name: 'Contact', type: 'text', section: 'IDENTITÉ' },
  { key: 'sef_contact_email', name: 'Courriel', type: 'text', section: 'IDENTITÉ' },
  { key: 'sef_contact_phone', name: 'Téléphone', type: 'text', section: 'IDENTITÉ' },

  // CARTE / DUPLICATION
  {
    key: 'sef_card_type',
    name: 'Type de carte',
    type: 'list',
    options: [
      { value: 'Parascolaire' },
      { value: 'Événement unique' },
      { value: 'Kiosque' },
      { value: 'Spectacle' },
      { value: 'Camp' },
      { value: 'Autre' },
    ],
    section: 'CARTE / DUPLICATION',
  },
  {
    key: 'sef_group_target',
    name: 'Groupe cible',
    type: 'list',
    options: [
      { value: 'Plus jeunes' },
      { value: 'Plus vieux' },
      { value: 'Tous' },
      { value: 'Groupe A' },
      { value: 'Groupe B' },
      { value: 'Autre' },
    ],
    section: 'CARTE / DUPLICATION',
  },
  { key: 'sef_duplicate_source', name: 'Carte source copiée', type: 'text', section: 'CARTE / DUPLICATION' },
  { key: 'sef_internal_notes', name: 'Notes internes', type: 'text', section: 'CARTE / DUPLICATION' },

  // SESSION
  {
    key: 'sef_season',
    name: 'Saison',
    type: 'list',
    options: [
      { value: 'Automne' },
      { value: 'Hiver' },
      { value: 'Printemps' },
      { value: 'Été' },
    ],
    section: 'SESSION',
  },
  {
    key: 'sef_status',
    name: 'Statut',
    type: 'list',
    options: [
      { value: 'Brouillon' },
      { value: 'À valider' },
      { value: 'Prêt à présenter' },
      { value: 'Envoyé' },
      { value: 'Confirmé' },
      { value: 'Inscriptions ouvertes' },
      { value: 'En cours' },
      { value: 'Terminé' },
      { value: 'Annulé' },
    ],
    section: 'SESSION',
  },
  {
    key: 'sef_program',
    name: 'Programme',
    type: 'list',
    options: [
      { value: 'NASA' },
      { value: 'Brixo' },
      { value: 'Robotique' },
      { value: 'Atomes crochus' },
      { value: 'Sciences dans tous les sens' },
      { value: 'Laboratoire en folie' },
      { value: 'Ingénieur Junior' },
      { value: 'Autre' },
    ],
    section: 'SESSION',
  },
  {
    key: 'sef_option',
    name: 'Option',
    type: 'list',
    options: [
      { value: 'Option A' },
      { value: 'Option B' },
      { value: 'Option C' },
      { value: 'Sur mesure' },
    ],
    section: 'SESSION',
  },
  { key: 'sef_grade_range', name: 'Niveaux scolaires', type: 'text', section: 'SESSION' },
  {
    key: 'sef_day_of_week',
    name: 'Jour',
    type: 'list',
    options: [
      { value: 'Lundi' },
      { value: 'Mardi' },
      { value: 'Mercredi' },
      { value: 'Jeudi' },
      { value: 'Vendredi' },
    ],
    section: 'SESSION',
  },
  { key: 'sef_start_time', name: 'Heure début', type: 'text', section: 'SESSION' },
  { key: 'sef_end_time', name: 'Heure fin', type: 'text', section: 'SESSION' },
  { key: 'sef_room', name: 'Local', type: 'text', section: 'SESSION' },
  { key: 'sef_weeks', name: 'Nombre de semaines', type: 'number', section: 'SESSION' },
  { key: 'sef_students_registered', name: 'Enfants inscrits', type: 'number', section: 'SESSION' },
  { key: 'sef_min_students', name: 'Minimum élèves', type: 'number', section: 'SESSION' },
  { key: 'sef_max_students', name: 'Maximum élèves', type: 'number', section: 'SESSION' },

  // OPTIONS
  { key: 'sef_double_session', name: 'Double session', type: 'checkbox', section: 'OPTIONS' },
  { key: 'sef_discovery_accessibility', name: 'Découverte / accessibilité', type: 'checkbox', section: 'OPTIONS' },
  { key: 'sef_distance_km', name: 'Distance aller‑retour km', type: 'number', section: 'OPTIONS' },
  { key: 'sef_extra_lab_minutes', name: 'Temps extra par labo', type: 'number', section: 'OPTIONS' },

  // DATES / JALONS
  { key: 'sef_coupon_delivery_date', name: 'Livraison coupons', type: 'date', section: 'DATES / JALONS' },
  { key: 'sef_coupon_distribution_date', name: 'Distribution coupons', type: 'date', section: 'DATES / JALONS' },
  { key: 'sef_registration_start_date', name: 'Début inscriptions', type: 'date', section: 'DATES / JALONS' },
  { key: 'sef_registration_end_date', name: 'Fin inscriptions', type: 'date', section: 'DATES / JALONS' },
  { key: 'sef_class_list_prep_date', name: 'Préparation listes', type: 'date', section: 'DATES / JALONS' },
  { key: 'sef_course_start_date', name: 'Début des cours', type: 'date', section: 'DATES / JALONS' },
  { key: 'sef_course_end_date', name: 'Fin des cours', type: 'date', section: 'DATES / JALONS' },

  // CALCULS / OPTIONNEL
  { key: 'sef_price_per_child_before_tax', name: 'Prix par enfant avant taxes', type: 'number', section: 'CALCULS / OPTIONNEL' },
  { key: 'sef_price_per_child_tax_included', name: 'Prix par enfant taxes incluses', type: 'number', section: 'CALCULS / OPTIONNEL' },
  { key: 'sef_price_per_lab', name: 'Prix par labo', type: 'number', section: 'CALCULS / OPTIONNEL' },
  { key: 'sef_revenue_total', name: 'Revenu total', type: 'number', section: 'CALCULS / OPTIONNEL' },
  { key: 'sef_required_groups', name: 'Groupes requis', type: 'number', section: 'CALCULS / OPTIONNEL' },
  { key: 'sef_discount_total', name: 'Rabais total', type: 'number', section: 'CALCULS / OPTIONNEL' },
  { key: 'sef_extra_total', name: 'Extras total', type: 'number', section: 'CALCULS / OPTIONNEL' },
  { key: 'sef_lab_cost_estimate', name: 'Coût labo estimé', type: 'number', section: 'CALCULS / OPTIONNEL' },
  { key: 'sef_profit_estimate', name: 'Marge estimée', type: 'number', section: 'CALCULS / OPTIONNEL' },

  // VALIDATION / TECHNIQUE
  { key: 'sef_validation_score', name: 'Score validation', type: 'number', section: 'VALIDATION / TECHNIQUE' },
  {
    key: 'sef_validation_status',
    name: 'Statut validation',
    type: 'list',
    options: [
      { value: 'Incomplet' },
      { value: 'Attention' },
      { value: 'Prêt à présenter' },
    ],
    section: 'VALIDATION / TECHNIQUE',
  },
  { key: 'sef_warnings', name: 'Alertes', type: 'text', section: 'VALIDATION / TECHNIQUE' },
  { key: 'sef_last_synced_at', name: 'Dernière synchro', type: 'date', section: 'VALIDATION / TECHNIQUE' },
  { key: 'sef_last_calculated_at', name: 'Dernier calcul', type: 'date', section: 'VALIDATION / TECHNIQUE' },
  { key: 'sef_sync_hash', name: 'Hash technique', type: 'text', section: 'VALIDATION / TECHNIQUE' },
  { key: 'sef_calc_version', name: 'Version calculateur', type: 'text', section: 'VALIDATION / TECHNIQUE' },
];

/**
 * Create a lookup map from key to definition for easier access.
 * This helper can be imported anywhere a quick lookup is required.
 */
export const fieldRegistryMap: Record<string, FieldDefinition> = {};
for (const def of fieldRegistry) {
  fieldRegistryMap[def.key] = def;
}