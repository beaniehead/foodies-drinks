const mongoose = require("mongoose");

const Store = mongoose.model("Store");
const User = mongoose.model("User");

const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");
const googleMapsClient = require("@google/maps").createClient({ key: process.env.MAP_KEY, Promise });

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: (req, file, next) => {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "Filetype not allowed!" }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render("index", { title: "Home" });
};

exports.addStore = (req, res) => {
  res.render("editStore", { title: "Add Store" });
};

// Image upload middleware
exports.upload = multer(multerOptions).single("photo");

// Image resize middleware
exports.resize = async (req, res, next) => {
  if (!req.file) {
    next(); // skip to the next middleware if no file
    return;
  }
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.cover(800, 800);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to our filesystem, keep going!
  next();
};

exports.getAddressComponents = async (req, res, next) => {
  // Get the address component
  const addressInfo = await googleMapsClient.geocode({ address: req.body.location.address }).asPromise();
  const addressComps = addressInfo.json.results[0].address_components;
  // Get country and city data for the store from location data
  let countryIndex;
  addressComps.forEach(obj => {
    // If locality exists, set city to this
    if (obj.types.includes("locality")) {
      req.body.location.city = obj.long_name;
    }
    // If country exists - and it should - set country to this
    if (obj.types.includes("country")) {
      req.body.location.country = obj.long_name;
      countryIndex = addressComps.indexOf(obj);
    }
  });
  // If no data returned above
  if (!req.body.location.city && !req.body.location.country) {
    next();
    return;
  }
  // If no locality set to - as user cannot input this data
  if (!req.body.location.city) {
    // If return array includes an object with type of country, and includes
    if (countryIndex <= addressComps.length - 1 && countryIndex >= 1) {
      // at least object before that, then set the city field to the long name of this object
      // req.body.location.city = addressComps[countryIndex - 1].long_name;
      // sets the city to the first address_component object name
      req.body.location.city = addressComps[0].long_name;
      // Otherwise, if there is only one field (the country field), then set the city value to the same
    } else if (req.body.location.country) {
      // If no country field, set it to -
      req.body.location.city = addressComps[countryIndex].long_name;
    }
  }
  next();
};
// if you don't use try{} catch(err){} you need to wrap it in catchErrors, so it handles error
exports.createStore = async (req, res) => {
  // Get user Id
  req.body.author = req.user._id;
  // as we are using strict schema, this will only pick up the object key:value pairs we defined in Store.js
  const store = await (new Store(req.body)).save();
  req.flash("success", `Successfully Created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;
  // 1. Query the database for a list of all stores
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: "desc" });
  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash("info", `Hey, you asked for page ${page}. But that page doesn't exist, so I put you on the last page - page ${pages}!`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }

  res.render("stores", { title: "Stores", count, pages, page, stores });
};
const confirmOwner = (store, user) => {
  if (!store.author.equals(user.id)) {
    throw Error("You must own a store in order to edit it!");
  }
};
exports.editStore = async (req, res) => {
  // Find the store given the ID
  const store = await Store.findOne({ _id: req.params.id });
  // Confirm they are the owner of the store
  confirmOwner(store, req.user);
  // Render out the form so the user can update their store
  res.render("editStore", { title: "Edit Store", store });
};

exports.updateStore = async (req, res) => {
  // Set the location data to be a point
  req.body.location.type = "Point";
  // Find and update the store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the new store instead of the old one
    runValidators: true
  }).exec();
  req.flash("success", `Successfully updated ${store.name}. <a href="/store/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store.id}/edit`);
  // Redirect them to the store and tell them it worked
};

exports.deleteStore = async (req, res) => {
  await Store.remove({ _id: req.params.id });
  req.flash("success", "Store Deleted!");
  res.redirect("/stores");
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate("author reviews");
  if (!store) return next();
  res.render("store", {
    store,
    title: store.name
  });
};

exports.getStoresByTag = async (req, res) => {
  // Gets our tags list, with sums for each tag - added to our model schema
  const { tag } = req.params;
  // If tag is selected, tagQuery is that tag, other return all stores that have a tag (all of them)
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  // Awaiting multiple promises to return - if promises do not require data from one another,
  // handle it asyncronously, so we are not getting data one at a time
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render("tags", { tags, title: "Tags", tag, stores });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    // First find stores that match
    .find(
      { $text: { $search: req.query.q } },
      { score: { $meta: "textScore" } }
    )
    // Then sort them
    .sort({ score: { $meta: "textScore" } })
    // Limit to five
    .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  // Create an array of our coordinates in the order expected and coverted to real numbers
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates
        },
        $maxDistance: 10000 // In meters
      }
    }
  };
  /*
  Same as below, but uses query projection instead of Selection
  const stores = await Store.find(q, { slug: 1, name: 1, location: 1, description: 1 }).limit(10);
  */
  const stores = await Store.find(q).select("slug name location description photo").limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render("map", { title: "Map" });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? "$pull" : "$addToSet";
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { [operator]: { hearts: req.params.id } },
    { new: true }// [operator] is either $pull of$addToSet depending on if the store was previously hearted
  );
  res.json(user);
};

exports.getHeartStores = async (req, res) => {
  const { hearts } = req.user;
  const stores = await Store.find({ _id: { $in: hearts } });
  res.render("stores", { stores, title: "My Favourites" });
};

exports.getTopStores = async (req, res) => {
  // Put the complex query in the model, rather than on the controller
  const stores = await Store.getTopStores();
  res.render("topStores", { stores, title: "Top Stores!" });
};
