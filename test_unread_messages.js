import fs from 'fs';

// Test unread message system with proper logging
async function testUnreadMessages() {
  console.log('Testing unread message system...');

  try {
    // Create message from admin user
    console.log('Creating message...');
    const createMessageResponse = await fetch('http://localhost:5000/api/conversations/34cee40b-98bb-4525-aa26-1bef5c19df69/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': fs.readFileSync('cookies.txt', 'utf-8')
      },
      body: JSON.stringify({
        content: 'Test message to verify unread system works'
      })
    });

    if (createMessageResponse.ok) {
      const message = await createMessageResponse.json();
      console.log('Message created:', message.id);
      console.log('Message isRead:', message.isRead);
    } else {
      console.log('Failed to create message:', await createMessageResponse.text());
    }

    // Check unread count
    console.log('Checking unread count...');
    const unreadResponse = await fetch('http://localhost:5000/api/user/unread-messages', {
      headers: {
        'Cookie': fs.readFileSync('cookies.txt', 'utf-8')
      }
    });

    if (unreadResponse.ok) {
      const unreadData = await unreadResponse.json();
      console.log('Unread count:', unreadData.count);
    } else {
      console.log('Failed to get unread count:', await unreadResponse.text());
    }

    // Check conversation details
    console.log('Checking conversation details...');
    const conversationResponse = await fetch('http://localhost:5000/api/conversations', {
      headers: {
        'Cookie': fs.readFileSync('cookies.txt', 'utf-8')
      }
    });

    if (conversationResponse.ok) {
      const conversations = await conversationResponse.json();
      console.log('Conversation unread count:', conversations[0]?.unreadCount);
      console.log('User ID in conversation:', conversations[0]?.jobPosterId, conversations[0]?.applicantId);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testUnreadMessages();