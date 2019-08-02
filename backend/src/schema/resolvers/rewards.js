import { neode } from '../../bootstrap/neo4j'
import { UserInputError } from 'apollo-server'

const instance = neode()

const getUserAndBadge = async ({ badgeKey, userId }) => {
  const user = await instance.first('User', 'id', userId)
  const badge = await instance.first('Badge', 'id', badgeKey)
  if (!user) throw new UserInputError("Couldn't find a user with that id")
  if (!badge) throw new UserInputError("Couldn't find a badge with that id")
  return { user, badge }
}

export default {
  Mutation: {
    reward: async (_object, params, context, _resolveInfo) => {
      const { user, badge } = await getUserAndBadge(params)
      await user.relateTo(badge, 'rewarded')
      return user.toJson()
    },

    unreward: async (_object, params, context, _resolveInfo) => {
      const { badgeKey, userId } = params
      const { user } = await getUserAndBadge(params)
      const session = context.driver.session()
      try {
        // silly neode cannot remove relationships
        await session.run(
          `
          MATCH (badge:Badge {id: $badgeKey})-[reward:REWARDED]->(rewardedUser:User {id: $userId})
          DELETE reward
          RETURN rewardedUser
          `,
          {
            badgeKey,
            userId,
          },
        )
      } finally {
        session.close()
      }
      return user.toJson()
    },
  },
}
