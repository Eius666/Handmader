import { readFileSync } from 'node:fs';
import test, { after, before } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'handmader-rules-test',
    firestore: {
      host: '127.0.0.1',
      port: 8085,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'orders', 'order-1'), {
      customerId: 'customer-1',
      status: 'awaiting_responses',
      responses: {},
      description: 'Тестовый заказ',
    });
    await setDoc(doc(context.firestore(), 'users', 'customer-1'), {
      email: 'customer@example.test',
      displayName: 'Private Customer',
      role: 'customer',
      verificationSocialLinks: ['https://example.test/private'],
    });
    await setDoc(doc(context.firestore(), 'publicProfiles', 'customer-1'), {
      customerAlias: 'Заказчик №1001',
      role: 'customer',
      rating: 0,
    });
    await setDoc(doc(context.firestore(), 'orders', 'order-1', 'proposals', 'master-1'), {
      masterId: 'master-1',
      price: 9_500,
    });
    await setDoc(doc(context.firestore(), 'orders', 'order-1', 'proposals', 'master-2'), {
      masterId: 'master-2',
      price: 10_500,
    });
    await setDoc(doc(context.firestore(), 'chats', 'chat-1'), {
      orderId: 'order-1',
      customerId: 'customer-1',
      masterId: 'master-1',
      unreadCustomer: 1,
      unreadMaster: 0,
    });
    await setDoc(doc(context.firestore(), 'chats', 'chat-1', 'messages', 'seed'), {
      senderId: 'master-1',
      text: 'Первое сообщение',
      createdAt: 0,
      read: false,
    });
    await setDoc(doc(context.firestore(), 'notifications', 'notification-1'), {
      userId: 'customer-1',
      type: 'new_response',
      title: 'Новый отклик',
      body: 'Тест',
      read: false,
      createdAt: 0,
    });
    await setDoc(doc(context.firestore(), 'staffMembers', 'staff-1'), {
      role: 'admin',
      active: true,
    });
  });
});

after(async () => {
  await environment?.cleanup();
});

test('browser cannot select a master by updating trusted fields', async () => {
  const db = environment.authenticatedContext('customer-1').firestore();

  await assertFails(updateDoc(doc(db, 'orders', 'order-1'), {
    status: 'master_selected',
    selectedMasterId: 'master-1',
    selectedMasterName: 'Мастер №1842',
    selectedPrice: 9_500,
  }));
});

test('browser cannot bypass server order visibility with a direct read', async () => {
  const customerDb = environment.authenticatedContext('customer-1').firestore();
  const masterDb = environment.authenticatedContext('master-1').firestore();

  await assertFails(getDoc(doc(customerDb, 'orders', 'order-1')));
  await assertFails(getDoc(doc(masterDb, 'orders', 'order-1')));
});

test('private profile is owner-only and cannot be forged by its owner', async () => {
  const ownerDb = environment.authenticatedContext('customer-1').firestore();
  const intruderDb = environment.authenticatedContext('intruder').firestore();

  await assertSucceeds(getDoc(doc(ownerDb, 'users', 'customer-1')));
  await assertFails(getDoc(doc(intruderDb, 'users', 'customer-1')));
  await assertFails(updateDoc(doc(ownerDb, 'users', 'customer-1'), {
    verificationStatus: 'verified',
  }));
  await assertSucceeds(getDoc(doc(intruderDb, 'publicProfiles', 'customer-1')));
});

test('browser cannot create an order or forge a system notification', async () => {
  const db = environment.authenticatedContext('customer-1').firestore();

  await assertFails(setDoc(doc(db, 'orders', 'forged-order'), {
    customerId: 'customer-1',
    status: 'awaiting_responses',
    responseCount: 0,
  }));
  await assertFails(setDoc(doc(db, 'notifications', 'forged-notification'), {
    userId: 'intruder',
    type: 'master_selected',
    read: false,
  }));
  await assertFails(getDoc(doc(db, 'notifications', 'notification-1')));
  await assertFails(updateDoc(doc(db, 'notifications', 'notification-1'), { read: true }));
});

test('browser cannot advance an order status', async () => {
  const db = environment.authenticatedContext('master-1').firestore();

  await assertFails(updateDoc(doc(db, 'orders', 'order-1'), {
    status: 'in_progress',
  }));
});

test('browser cannot physically delete an order', async () => {
  const db = environment.authenticatedContext('customer-1').firestore();

  await assertFails(deleteDoc(doc(db, 'orders', 'order-1')));
});

test('browser cannot forge an embedded or standalone review', async () => {
  const db = environment.authenticatedContext('customer-1').firestore();

  await assertFails(updateDoc(doc(db, 'orders', 'order-1'), {
    ratings: [{ rating: 5, userId: 'customer-1' }],
  }));
  await assertFails(updateDoc(doc(db, 'orders', 'order-1'), {
    reviewAuthorIds: ['customer-1'],
  }));
  await assertFails(setDoc(doc(db, 'reviews', 'order-1_customer-1'), {
    orderId: 'order-1',
    authorId: 'customer-1',
    subjectId: 'master-1',
    rating: 5,
  }));
  await assertFails(getDoc(doc(db, 'reviews', 'order-1_customer-1')));
});

test('browser cannot discover or forge staff access', async () => {
  const staffDb = environment.authenticatedContext('staff-1').firestore();
  const customerDb = environment.authenticatedContext('customer-1').firestore();

  await assertFails(getDoc(doc(staffDb, 'staffMembers', 'staff-1')));
  await assertFails(getDoc(doc(customerDb, 'staffMembers', 'staff-1')));
  await assertFails(setDoc(doc(customerDb, 'staffMembers', 'customer-1'), {
    role: 'admin',
    active: true,
  }));
});

test('browser cannot forge agreement or payment state', async () => {
  const db = environment.authenticatedContext('customer-1').firestore();

  await assertFails(updateDoc(doc(db, 'orders', 'order-1'), {
    agreementStatus: 'confirmed',
    finalPrice: 1,
    paymentStatus: 'funded',
  }));
  await assertFails(setDoc(doc(db, 'agreements', 'order-1'), {
    orderId: 'order-1',
    status: 'confirmed',
    finalPrice: 1,
  }));
  await assertFails(setDoc(doc(db, 'payments', 'order-1'), {
    orderId: 'order-1',
    status: 'funded',
    grossAmountMinor: 100,
  }));
});

test('browser cannot write an embedded or standalone proposal', async () => {
  const db = environment.authenticatedContext('master-1').firestore();

  await assertFails(updateDoc(doc(db, 'orders', 'order-1'), {
    'responses.master-1': {
      masterId: 'master-1',
      price: 9_500,
    },
  }));
  await assertFails(setDoc(doc(db, 'orders', 'order-1', 'proposals', 'master-1'), {
    masterId: 'master-1',
    price: 1,
  }));
});

test('master sees only own proposal while customer sees every proposal', async () => {
  const masterDb = environment.authenticatedContext('master-1').firestore();
  const customerDb = environment.authenticatedContext('customer-1').firestore();

  await assertSucceeds(getDoc(doc(masterDb, 'orders', 'order-1', 'proposals', 'master-1')));
  await assertFails(getDoc(doc(masterDb, 'orders', 'order-1', 'proposals', 'master-2')));
  await assertSucceeds(getDoc(doc(customerDb, 'orders', 'order-1', 'proposals', 'master-1')));
  await assertSucceeds(getDoc(doc(customerDb, 'orders', 'order-1', 'proposals', 'master-2')));
});

test('browser cannot read or mutate raw chat documents', async () => {
  const customerDb = environment.authenticatedContext('customer-1').firestore();
  const intruderDb = environment.authenticatedContext('intruder').firestore();

  await assertFails(getDoc(doc(customerDb, 'chats', 'chat-1')));
  await assertFails(getDoc(doc(customerDb, 'chats', 'chat-1', 'messages', 'seed')));
  await assertFails(getDoc(doc(intruderDb, 'chats', 'chat-1')));
  await assertFails(getDoc(doc(intruderDb, 'chats', 'chat-1', 'messages', 'seed')));
  await assertFails(setDoc(doc(customerDb, 'chats', 'chat-1', 'messages', 'forged'), {
    senderId: 'master-1',
    text: 'Подделанное сообщение',
    read: false,
  }));
});

test('browser cannot clear chat read state directly', async () => {
  const customerDb = environment.authenticatedContext('customer-1').firestore();
  const masterDb = environment.authenticatedContext('master-1').firestore();

  await assertFails(updateDoc(doc(customerDb, 'chats', 'chat-1'), {
    unreadCustomer: 0,
  }));
  await assertFails(updateDoc(doc(customerDb, 'chats', 'chat-1', 'messages', 'seed'), {
    read: true,
  }));
  await assertFails(updateDoc(doc(masterDb, 'chats', 'chat-1'), {
    unreadCustomer: 5,
  }));
});

test('browser cannot query chat message history', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (let index = 1; index <= 51; index += 1) {
      const id = String(index).padStart(3, '0');
      await setDoc(doc(db, 'chats', 'chat-1', 'messages', id), {
        text: id,
        createdAt: index,
      });
    }
  });

  const db = environment.authenticatedContext('customer-1').firestore();
  await assertFails(getDocs(query(
    collection(db, 'chats', 'chat-1', 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50),
  )));
});
