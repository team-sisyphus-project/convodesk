# Seeds a demo-sized dataset into the local development database so that
# demo/capture.mjs has something realistic to record. Run with:
#   bundle exec rails runner demo/seed_demo_data.rb
account = Account.first
agent = User.find_by(email: 'john@acme.inc')

inbox_defs = [
  ['Website', -> { Channel::WebWidget.create!(account: account, website_url: 'https://acme.inc') }],
  ['Email', -> { Channel::Email.create!(account: account, email: 'support@acme.inc', forward_to_email: 'support@acme.inc') }],
  ['API', -> { Channel::Api.create!(account: account, identifier: SecureRandom.hex(8)) }]
]

inboxes = inbox_defs.map do |name, channel_builder|
  inbox = account.inboxes.find_by(name: "Acme #{name}")
  next inbox if inbox

  inbox = Inbox.create!(channel: channel_builder.call, account: account, name: "Acme #{name}")
  InboxMember.create!(user: agent, inbox: inbox)
  inbox
end

people = [
  ['Nora Whitfield', 'nora@driftburner.inc', '+14155550142', 'Can we use the same widget on two domains?'],
  ['Milo Aranda', 'milo@paperlayer.co', '+14155550178', 'My invoice shows the old plan price.'],
  ['Sunny Okafor', 'sunny@northlight.io', '+14155550119', 'How do I export a conversation transcript?'],
  ['Petra Lindqvist', 'petra@vantaglass.se', '+46701234567', 'The mobile app keeps logging me out.'],
  ['Dev Ramachandran', 'dev@saffronworks.in', '+919876543210', 'Need help setting up my new device.'],
  ['Ana Belmonte', 'ana@cieloroto.es', '+34600123456', 'Is there a way to schedule replies?'],
  ['Tobias Wren', 'tobias@harborglass.co.uk', '+447700900123', 'Billing question about seats.'],
  ['Yuki Sasaki', 'yuki@kotoha.jp', '+818012345678', 'Can I connect a second email inbox?']
]

statuses = %i[open open open pending open resolved open pending]

people.each_with_index do |(name, email, phone, first_message), index|
  next if Contact.find_by(account: account, email: email)

  inbox = inboxes[index % inboxes.length]
  contact_inbox = ContactInboxWithContactBuilder.new(
    source_id: "demo-#{index}-#{SecureRandom.hex(4)}",
    inbox: inbox,
    hmac_verified: true,
    contact_attributes: { name: name, email: email, phone_number: phone }
  ).perform

  conversation = Conversation.create!(
    account: account,
    inbox: inbox,
    status: statuses[index],
    assignee: index.even? ? agent : nil,
    contact: contact_inbox.contact,
    contact_inbox: contact_inbox,
    additional_attributes: {}
  )

  Message.create!(content: first_message, account: account, inbox: inbox, conversation: conversation,
                  sender: contact_inbox.contact, message_type: :incoming,
                  created_at: (index + 1).hours.ago)

  next if index > 5

  Message.create!(content: "Thanks for reaching out! Let me take a look at that for you.", account: account,
                  inbox: inbox, conversation: conversation, sender: agent, message_type: :outgoing,
                  created_at: ((index + 1).hours - 12.minutes).ago)

  next if index > 3

  Message.create!(content: 'Perfect, that worked. Thank you!', account: account, inbox: inbox,
                  conversation: conversation, sender: contact_inbox.contact, message_type: :incoming,
                  created_at: ((index + 1).hours - 20.minutes).ago)
end

%w[billing device-setup lead onboarding].each do |title|
  account.labels.find_or_create_by!(title: title) { |label| label.color = %w[#1F93FF #7C3AED #059669 #D97706].sample }
end

Conversation.where(account: account).limit(4).each_with_index do |conversation, index|
  conversation.update_labels([%w[billing][0], %w[device-setup][0], %w[lead][0], %w[onboarding][0]][index])
end

puts "inboxes=#{account.inboxes.count} contacts=#{Contact.where(account: account).count} conversations=#{Conversation.where(account: account).count} messages=#{Message.where(account: account).count}"
