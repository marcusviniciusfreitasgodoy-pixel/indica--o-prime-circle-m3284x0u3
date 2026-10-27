/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. referrals
    const referralsCol = app.findCollectionByNameOrId('referrals')
    let refChanged = false
    if (!referralsCol.fields.getByName('anonymized_at')) {
      referralsCol.fields.add(new DateField({ name: 'anonymized_at', required: false }))
      refChanged = true
    }
    if (!referralsCol.fields.getByName('anonymized_reason')) {
      referralsCol.fields.add(new TextField({ name: 'anonymized_reason', required: false }))
      refChanged = true
    }
    if (refChanged) {
      app.save(referralsCol)
    }

    // 2. known_owner_base
    const knownOwners = app.findCollectionByNameOrId('known_owner_base')
    let ownersChanged = false
    if (!knownOwners.fields.getByName('anonymized_at')) {
      knownOwners.fields.add(new DateField({ name: 'anonymized_at', required: false }))
      ownersChanged = true
    }
    if (!knownOwners.fields.getByName('anonymized_reason')) {
      knownOwners.fields.add(new TextField({ name: 'anonymized_reason', required: false }))
      ownersChanged = true
    }
    if (ownersChanged) {
      app.save(knownOwners)
    }

    // 3. known_buyer_base
    const knownBuyers = app.findCollectionByNameOrId('known_buyer_base')
    let buyersChanged = false
    if (!knownBuyers.fields.getByName('anonymized_at')) {
      knownBuyers.fields.add(new DateField({ name: 'anonymized_at', required: false }))
      buyersChanged = true
    }
    if (!knownBuyers.fields.getByName('anonymized_reason')) {
      knownBuyers.fields.add(new TextField({ name: 'anonymized_reason', required: false }))
      buyersChanged = true
    }
    if (buyersChanged) {
      app.save(knownBuyers)
    }

    // 4. program_settings: certificar que retention_before_anonymization_months existe
    try {
      app.findFirstRecordByData('program_settings', 'key', 'retention_before_anonymization_months')
    } catch (_) {
      const psCol = app.findCollectionByNameOrId('program_settings')
      const rec = new Record(psCol)
      rec.set('key', 'retention_before_anonymization_months')
      rec.set('description', 'Retenção dos dados antes de anonimização automática (LGPD) em meses')
      rec.set('value_json', JSON.stringify(24))
      app.save(rec)
    }
  },
  (app) => {
    // down
  },
)
