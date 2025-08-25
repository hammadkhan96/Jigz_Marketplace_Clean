import fs from 'fs';

async function testUnreadMessageScenario() {
  console.log('Testing unread message system with two users...');

  try {
    // Step 1: Login as john_doe and send a message
    console.log('\n1. Logging in as john_doe...');
    const loginJohn = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john@example.com', password: 'password123' })
    });

    if (!loginJohn.ok) {
      console.log('Failed to login as john_doe:', await loginJohn.text());
      return;
    }

    const johnCookies = loginJohn.headers.get('set-cookie');
    console.log('John logged in successfully');

    // Send message as john_doe
    console.log('\n2. John sending message...');
    const sendMessage = await fetch('http://localhost:5000/api/conversations/34cee40b-98bb-4525-aa26-1bef5c19df69/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': johnCookies
      },
      body: JSON.stringify({ content: 'Message from John to test unread system' })
    });

    if (sendMessage.ok) {
      const message = await sendMessage.json();
      console.log('Message sent:', message.id, 'isRead:', message.isRead);
    } else {
      console.log('Failed to send message:', await sendMessage.text());
    }

    // Step 2: Login as admin and check unread messages
    console.log('\n3. Logging in as admin...');
    const loginAdmin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@jigz.co', password: 'admin123' })
    });

    if (!loginAdmin.ok) {
      console.log('Failed to login as admin:', await loginAdmin.text());
      return;
    }

    const adminCookies = loginAdmin.headers.get('set-cookie');
    console.log('Admin logged in successfully');

    // Check unread count for admin
    console.log('\n4. Checking admin unread messages...');
    const unreadResponse = await fetch('http://localhost:5000/api/user/unread-messages', {
      headers: { 'Cookie': adminCookies }
    });

    if (unreadResponse.ok) {
      const unreadData = await unreadResponse.json();
      console.log('Admin unread count:', unreadData.count);
    } else {
      console.log('Failed to get unread count:', await unreadResponse.text());
    }

    // Check conversation details for admin
    console.log('\n5. Checking admin conversations...');
    const conversationsResponse = await fetch('http://localhost:5000/api/conversations', {
      headers: { 'Cookie': adminCookies }
    });

    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();
      console.log('Admin conversation unread count:', conversations[0]?.unreadCount);
      console.log('Conversation participants:', {
        jobPoster: conversations[0]?.jobPosterId,
        applicant: conversations[0]?.applicantId
      });
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testUnreadMessageScenario();