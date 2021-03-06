import { UserInputError } from 'apollo-server'
import { getNeode } from '../../db/neo4j'
import fileUpload from './fileUpload'
import encryptPassword from '../../helpers/encryptPassword'
import generateNonce from './helpers/generateNonce'
import existingEmailAddress from './helpers/existingEmailAddress'
import normalizeEmail from './helpers/normalizeEmail'
import createOrUpdateLocations from './users/location'

const neode = getNeode()

export default {
  Mutation: {
    Signup: async (_parent, args, context) => {
      args.nonce = generateNonce()
      args.email = normalizeEmail(args.email)
      let emailAddress = await existingEmailAddress({ args, context })
      if (emailAddress) return emailAddress
      try {
        emailAddress = await neode.create('EmailAddress', args)
        return emailAddress.toJson()
      } catch (e) {
        throw new UserInputError(e.message)
      }
    },
    SignupVerification: async (_parent, args, context) => {
      const { driver } = context
      const session = driver.session()
      const { termsAndConditionsAgreedVersion } = args
      const regEx = new RegExp(/^[0-9]+\.[0-9]+\.[0-9]+$/g)
      if (!regEx.test(termsAndConditionsAgreedVersion)) {
        throw new UserInputError('Invalid version format!')
      }
      args.termsAndConditionsAgreedAt = new Date().toISOString()

      let { nonce, email } = args
      email = normalizeEmail(email)
      const result = await neode.cypher(
        `
      MATCH(email:EmailAddress {nonce: {nonce}, email: {email}})
      WHERE NOT (email)-[:BELONGS_TO]->()
      RETURN email
      `,
        { nonce, email },
      )
      const emailAddress = await neode.hydrateFirst(result, 'email', neode.model('EmailAddress'))
      if (!emailAddress) throw new UserInputError('Invalid email or nonce')
      args = await fileUpload(args, { file: 'avatarUpload', url: 'avatar' })
      args = await encryptPassword(args)
      try {
        const user = await neode.create('User', args)
        await Promise.all([
          user.relateTo(emailAddress, 'primaryEmail'),
          emailAddress.relateTo(user, 'belongsTo'),
          emailAddress.update({ verifiedAt: new Date().toISOString() }),
        ])
        await createOrUpdateLocations(args.id, args.locationName, session)
        return user.toJson()
      } catch (e) {
        if (e.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('User with this slug already exists!')
        throw new UserInputError(e.message)
      } finally {
        session.close()
      }
    },
  },
}
