#!/usr/bin/env python3
"""
Fix Prisma relation names to match between models.
The users model has named relations but other models have unnamed 'users' fields.
We need to add @relation("Name") to match.
"""

def fix_relations():
    schema_file = 'prisma/schema.prisma'
    
    with open(schema_file, 'r') as f:
        content = f.read()
    
    # Map of model -> field -> relation name from users model
    fixes = [
        # astronomy_events
        ('model astronomy_events', '  users           users             @relation(fields: [created_by]',
         '  creator         users             @relation("AstronomyEventCreator", fields: [created_by]'),
        
        # chat_messages  
        ('model chat_messages', '  users               users?              @relation(fields: [user_id]',
         '  user                users?              @relation("ChatMessageUser", fields: [user_id]'),
        
        # event_reminders
        ('model event_reminders', '  users             users            @relation(fields: [user_id]',
         '  user              users            @relation("UserEventReminders", fields: [user_id]'),
        
        # group_chats
        ('model group_chats', '  users         users           @relation(fields: [created_by]',
         '  creator       users           @relation("GroupChatCreator", fields: [created_by]'),
        
        # group_members
        ('model group_members', '  users       users       @relation(fields: [user_id]',
         '  user        users       @relation("GroupMembership", fields: [user_id]'),
        
        # message_reactions
        ('model message_reactions', '  users         users         @relation(fields: [user_id]',
         '  user          users         @relation("MessageReaction", fields: [user_id]'),
        
        # poll_comments
        ('model poll_comments', '  users      users    @relation(fields: [user_id]',
         '  commenter  users    @relation("PollCommenter", fields: [user_id]'),
        
        # poll_votes
        ('model poll_votes', '  users        users        @relation(fields: [user_id]',
         '  voter        users        @relation("PollVoter", fields: [user_id]'),
        
        # polls
        ('model polls', '  users         users           @relation(fields: [created_by]',
         '  creator       users           @relation("PollCreator", fields: [created_by]'),
        
        # session_enrollments
        ('model session_enrollments', '  users            users                     @relation(fields: [user_id]',
         '  user             users                     @relation("UserSessionEnrollments", fields: [user_id]'),
        
        # sessions
        ('model sessions', '  users               users                 @relation(fields: [created_by]',
         '  creator             users                 @relation("SessionCreator", fields: [created_by]'),
        
        # space_discussion_comment_likes
        ('model space_discussion_comment_likes', '  users                     users                     @relation(fields: [user_id]',
         '  user                      users                     @relation("DiscussionCommentLikes", fields: [user_id]'),
        
        # space_discussion_comments
        ('model space_discussion_comments', '  users                           users                            @relation(fields: [user_id]',
         '  user                            users                            @relation("DiscussionComments", fields: [user_id]'),
        
        # space_discussion_likes
        ('model space_discussion_likes', '  users             users             @relation(fields: [user_id]',
         '  user              users             @relation("DiscussionLikes", fields: [user_id]'),
        
        # space_discussions
        ('model space_discussions', '  users                     users                       @relation(fields: [author_id]',
         '  author                    users                       @relation("DiscussionAuthor", fields: [author_id]'),
        
        # space_news
        ('model space_news', '  users               users                 @relation(fields: [published_by]',
         '  publisher           users                 @relation("SpaceNewsPublisher", fields: [published_by]'),
        
        # space_news_comments
        ('model space_news_comments', '  users                     users                 @relation(fields: [user_id]',
         '  user                      users                 @relation("SpaceNewsComments", fields: [user_id]'),
        
        # space_news_likes
        ('model space_news_likes', '  users         users      @relation(fields: [user_id]',
         '  user          users      @relation("SpaceNewsLikes", fields: [user_id]'),
        
        # stargazing_spot_reviews
        ('model stargazing_spot_reviews', '  users              users            @relation(fields: [user_id]',
         '  user               users            @relation("StargazingSpotReviews", fields: [user_id]'),
        
        # stargazing_spots
        ('model stargazing_spots', '  users                   users                     @relation(fields: [created_by]',
         '  creator                 users                     @relation("StargazingSpotCreator", fields: [created_by]'),
    ]
    
    for model_marker, old_line, new_line in fixes:
        # Find the model section
        model_start = content.find(model_marker)
        if model_start == -1:
            print(f"Warning: Could not find {model_marker}")
            continue
        
        # Find the field within this model
        search_start = model_start
        field_pos = content.find(old_line, search_start)
        if field_pos == -1:
            print(f"Warning: Could not find field in {model_marker}")
            continue
        
        # Replace just the field definition
        # Find the end of the line
        line_end = content.find('\n', field_pos)
        old_full_line = content[field_pos:line_end]
        new_full_line = new_line + old_full_line[len(old_line):]
        
        content = content[:field_pos] + new_full_line + content[line_end:]
        print(f"✅ Fixed relation in {model_marker.split()[1]}")
    
    with open(schema_file, 'w') as f:
        f.write(content)
    
    print(f"\n🎉 All relations fixed!")

if __name__ == '__main__':
    fix_relations()
