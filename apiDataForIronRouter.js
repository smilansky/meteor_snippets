var Fiber = require('fibers');
var Future = require('fibers/futures');
//client only collection for storing the retrieved data
var Subscriptions = new Mongo.Collection('subscription');
//use waitOn to subscribe to Meteor publications
Router.route('/admin', {
  name: 'admin', 
  waitOn: function() {
    return [Meteor.subscribe("account"), Meteor.subscribe("subscription")];
  },
  action: function(){
    this.render('admin');
  }
});


//create a publication on the server that sends DDP messages to the clients after the data is retrieved using added and ready methods
Meteor.publish("subscription", function subscriptionPublish() {
  var context = this;
  var uuid = Meteor.users.findOne(this.userId).planUuid;

  Meteor.call('getSubscription', uuid, function(error, subscription){
    if (error) {
      context.ready();
    } else {
      context.added("subscription", uuid, subscription);
      context.ready();
    }
  });
});

//retrieve data asynchronously on the server and block using a future 
Meteor.methods({
  getSubscription: function getSubscription(uuid) {
    var subscriptionInfo = new Future();

    Meteor.http.get(Meteor.settings.private.recurlyURL + 'subscriptions/' + uuid, {content: "", headers: {"Authorization": "Basic " + RECURLY_API_KEY, "Accept": "application/xml", "Content-Type": "application/xml; charset=utf-8"}}, function(error, response) {
      var content;
      if (error) {
        subscriptionInfo.return(new Meteor.Error('recurly-error', error));
      } else {
        xml2js.parseString(response.content, function(error, response) {
          content = response; 
        });
        subscriptionInfo.return(content.subscription);
      }
    });

    return subscriptionInfo.wait(); 

  }


});


//on the client we can then retrieve our new subscription
var subscription = Subscriptions.findOne({});
