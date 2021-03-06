Feature: Post Comment
  As a user
  I want to comment on contributions of others
  To be able to express my thoughts and emotions about these, discuss, and add give further information.

  Background:
    Given I have a user account
    And we have the following posts in our database:
      | id         | title                                         | slug       | authorId        | commentContent         |
      | bWBjpkTKZp | 101 Essays that will change the way you think | 101-essays | id-of-peter-pan | @peter-pan reply to me |
    And I am logged in

  Scenario: Comment creation
    Given I visit "post/bWBjpkTKZp/101-essays"
    And I type in the following text:
    """
    Human Connection rocks
    """
    And I click on the "Comment" button
    Then my comment should be successfully created
    And I should see my comment
    And the editor should be cleared

  Scenario: View medium length comments
    Given I visit "post/bWBjpkTKZp/101-essays"
    And I type in a comment with 305 characters
    And I click on the "Comment" button
    Then my comment should be successfully created
    And I should see the entirety of my comment
    And the editor should be cleared

  Scenario: View long comments
    Given I visit "post/bWBjpkTKZp/101-essays"
    And I type in a comment with 1205 characters
    And I click on the "Comment" button
    Then my comment should be successfully created
    And I should see an abreviated version of my comment
    And the editor should be cleared

  Scenario: Direct reply to Comment
    Given I visit "post/bWBjpkTKZp/101-essays"
    And I click on the reply button
    Then it should create a mention in the CommentForm
