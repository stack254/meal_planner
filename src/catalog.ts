import type { Ingredient, Recipe, Slot, PlanTemplate } from "./data";

type Group =
  | "Breakfast"
  | "Ugali"
  | "Rice"
  | "Chicken"
  | "Beef"
  | "Pork"
  | "Fish"
  | "Legumes"
  | "Potatoes & pasta"
  | "Snacks"
  | "Vegetables & soups";
type Row = [string, string, string, number];
const groupRows: Record<Group, Row[]> = {
  Breakfast: [
    [
      "Boiled eggs, bread & milk",
      "eggs=2pcs;bread=2slices;milk=250ml",
      "Boil eggs until firm, toast bread and serve with a glass of milk.",
      12,
    ],
    [
      "Fried eggs & toast",
      "eggs=2pcs;bread=2slices;oil=5ml",
      "Fry eggs gently in a little oil and serve on toasted bread.",
      10,
    ],
    [
      "Scrambled eggs with tomato",
      "eggs=2pcs;tomato=60g;onion=20g;oil=5ml",
      "Soften onion and tomato, then stir in beaten eggs until just set.",
      12,
    ],
    [
      "Sukuma omelette",
      "eggs=2pcs;sukuma=50g;onion=20g;oil=5ml",
      "Wilt chopped greens and onion, pour over beaten eggs and fold the omelette.",
      15,
    ],
    [
      "Eggs, bread & avocado",
      "eggs=2pcs;bread=2slices;avocado=1pcs",
      "Boil eggs, toast bread and slice avocado just before serving.",
      12,
    ],
    [
      "Sweet potatoes with warm milk",
      "sweet potatoes=250g;milk=250ml",
      "Boil sweet potatoes until tender and serve with gently warmed milk.",
      25,
    ],
    [
      "Arrowroots with milk tea",
      "arrowroots=250g;milk=100ml;tea=3g",
      "Boil arrowroots until a knife passes through; brew tea and add milk.",
      35,
    ],
    [
      "Mandazi with milk",
      "mandazi=2pcs;milk=250ml",
      "Warm mandazi briefly and serve with milk.",
      5,
    ],
    [
      "Chapati with fried eggs",
      "chapati=1pcs;eggs=2pcs;oil=5ml",
      "Warm chapati and fry eggs until cooked to preference.",
      12,
    ],
    [
      "Porridge with groundnuts",
      "maize flour=60g;milk=150ml;groundnuts=30g",
      "Whisk flour into simmering liquid until smooth; top with groundnuts.",
      15,
    ],
    [
      "Oats with banana",
      "oats=70g;milk=200ml;bananas=1pcs",
      "Simmer oats in milk until soft; slice banana over the bowl.",
      10,
    ],
    [
      "Pancakes with milk",
      "wheat flour=100g;eggs=1pcs;milk=250ml;oil=5ml",
      "Whisk flour, egg and milk; cook small pancakes on both sides.",
      25,
    ],
    [
      "Peanut butter toast",
      "bread=2slices;peanut butter=30g;bananas=1pcs",
      "Toast bread, spread peanut butter and add sliced banana.",
      5,
    ],
    [
      "Egg sandwich with tomato",
      "bread=2slices;eggs=2pcs;tomato=60g",
      "Boil eggs, slice with tomato and layer between bread.",
      13,
    ],
    [
      "Sweet potatoes with boiled eggs",
      "sweet potatoes=220g;eggs=2pcs",
      "Boil sweet potatoes and eggs separately; serve warm.",
      25,
    ],
    [
      "Beans with chapati breakfast",
      "beans=150g;chapati=1pcs;tomato=50g",
      "Warm cooked beans with tomato and serve with chapati.",
      15,
    ],
    [
      "Githeri and tea",
      "githeri=220g;tea=3g;milk=80ml",
      "Warm githeri thoroughly and brew a cup of milk tea.",
      12,
    ],
    [
      "Fruit and yoghurt bowl",
      "yoghurt=200g;bananas=1pcs;mango=100g",
      "Slice fruit and spoon over chilled yoghurt.",
      5,
    ],
    [
      "Avocado egg toast",
      "bread=2slices;eggs=1pcs;avocado=1pcs",
      "Toast bread, mash avocado and top with a cooked egg.",
      12,
    ],
    [
      "Millet porridge with banana",
      "millet flour=60g;milk=150ml;bananas=1pcs",
      "Cook millet flour into a smooth porridge and top with banana.",
      17,
    ],
    [
      "Arrowroots with peanut butter",
      "arrowroots=230g;peanut butter=25g",
      "Boil arrowroots until tender; serve with peanut butter on the side.",
      35,
    ],
    [
      "Vegetable egg wrap",
      "chapati=1pcs;eggs=2pcs;cabbage=60g;tomato=40g",
      "Cook eggs with vegetables, then roll in a warmed chapati.",
      18,
    ],
  ],
  Ugali: [
    [
      "Ugali with beef stew",
      "ugali=120g;beef=130g;tomato=80g;onion=40g",
      "Cook ugali until firm; simmer beef with onion and tomato until tender.",
      45,
    ],
    [
      "Ugali with chicken stew",
      "ugali=120g;chicken=140g;tomato=70g;onion=40g",
      "Cook ugali; simmer chicken with onion and tomato until fully cooked.",
      45,
    ],
    [
      "Ugali with pork stew",
      "ugali=120g;pork=140g;tomato=70g;onion=40g",
      "Cook ugali; brown pork and simmer with tomato until cooked through.",
      45,
    ],
    [
      "Ugali with tilapia",
      "ugali=120g;tilapia=180g;sukuma=90g",
      "Cook ugali; pan-cook tilapia fully and sauté sukuma wiki.",
      40,
    ],
    [
      "Ugali with omena",
      "ugali=120g;omena=100g;tomato=70g;onion=30g",
      "Cook ugali; simmer cleaned omena with onion and tomato.",
      30,
    ],
    [
      "Ugali with fried eggs",
      "ugali=120g;eggs=2pcs;sukuma=80g",
      "Cook ugali, fry eggs and quickly wilt the sukuma wiki.",
      25,
    ],
    [
      "Ugali with beans stew",
      "ugali=120g;beans=150g;tomato=70g",
      "Cook ugali; simmer cooked beans with chopped tomato.",
      30,
    ],
    [
      "Ugali with ndengu",
      "ugali=120g;ndengu=150g;onion=30g;tomato=60g",
      "Cook ugali; simmer cooked green grams with onion and tomato.",
      30,
    ],
    [
      "Ugali with sukuma wiki",
      "ugali=120g;sukuma=180g;onion=30g;oil=8ml",
      "Cook ugali; sauté onion and chopped sukuma until tender.",
      22,
    ],
    [
      "Ugali with cabbage",
      "ugali=120g;cabbage=180g;carrots=60g;oil=8ml",
      "Cook ugali; stir-fry cabbage and carrot until tender-crisp.",
      25,
    ],
    [
      "Ugali with beef liver",
      "ugali=120g;liver=130g;onion=40g;tomato=70g",
      "Cook ugali; sear liver, then finish with onion and tomato.",
      30,
    ],
    [
      "Ugali with minced beef",
      "ugali=120g;minced beef=130g;tomato=70g;onion=40g",
      "Cook ugali; brown minced beef and simmer in tomato sauce.",
      30,
    ],
    [
      "Ugali with kienyeji greens",
      "ugali=120g;kienyeji greens=180g;onion=30g",
      "Cook ugali; wash and simmer local greens until tender.",
      30,
    ],
    [
      "Ugali with cowpeas",
      "ugali=120g;cowpeas=150g;tomato=60g",
      "Cook ugali; warm cooked cowpeas in a light tomato sauce.",
      30,
    ],
    [
      "Ugali with pumpkin leaves",
      "ugali=120g;pumpkin leaves=180g;onion=30g",
      "Cook ugali; wash pumpkin leaves well and sauté with onion.",
      28,
    ],
    [
      "Ugali with fish stew",
      "ugali=120g;white fish=160g;tomato=80g;onion=35g",
      "Cook ugali; simmer fish gently in onion and tomato sauce until cooked.",
      38,
    ],
  ],
  Rice: [
    [
      "Rice with beef stew",
      "rice=110g;beef=130g;tomato=70g;onion=35g",
      "Cook rice; simmer beef with onion and tomato until tender.",
      45,
    ],
    [
      "Rice with chicken stew",
      "rice=110g;chicken=140g;tomato=70g;onion=35g",
      "Cook rice; stew chicken with tomato until fully cooked.",
      45,
    ],
    [
      "Rice with pork and cabbage",
      "rice=110g;pork=130g;cabbage=100g",
      "Cook rice; brown pork fully and sauté cabbage separately.",
      40,
    ],
    [
      "Rice with tilapia",
      "rice=110g;tilapia=170g;tomato=60g",
      "Cook rice and pan-cook tilapia; serve with tomato relish.",
      38,
    ],
    [
      "Rice with beans stew",
      "rice=110g;beans=150g;tomato=70g",
      "Cook rice; simmer cooked beans with tomato until thickened.",
      30,
    ],
    [
      "Rice with ndengu stew",
      "rice=110g;ndengu=150g;onion=35g",
      "Cook rice; simmer cooked ndengu with onion until creamy.",
      30,
    ],
    [
      "Rice with green peas",
      "rice=110g;peas=130g;carrots=60g",
      "Cook rice; sauté peas and carrots until tender.",
      28,
    ],
    [
      "Vegetable fried rice",
      "rice=110g;carrots=70g;peas=70g;cabbage=70g;oil=10ml",
      "Cook and cool rice, then stir-fry with chopped vegetables.",
      30,
    ],
    [
      "Egg fried rice",
      "rice=110g;eggs=2pcs;peas=60g;oil=10ml",
      "Cook and cool rice; scramble eggs, add peas and toss with rice.",
      28,
    ],
    [
      "Beef pilau",
      "rice=110g;beef=130g;pilau masala=8g;onion=50g",
      "Brown beef and onion with pilau spice, then cook rice in the seasoned liquid.",
      50,
    ],
    [
      "Coconut rice with beans",
      "rice=110g;coconut milk=160ml;beans=130g",
      "Simmer rice in coconut milk and water; serve with warmed beans.",
      35,
    ],
    [
      "Rice with liver and onions",
      "rice=110g;liver=130g;onion=60g",
      "Cook rice; sear liver and soften sliced onions separately.",
      32,
    ],
    [
      "Rice with minced beef",
      "rice=110g;minced beef=130g;tomato=70g",
      "Cook rice; brown minced beef and simmer with tomato.",
      30,
    ],
    [
      "Rice with mixed vegetables",
      "rice=110g;carrots=80g;peas=70g;sukuma=70g",
      "Cook rice and fold in separately sautéed vegetables.",
      30,
    ],
    [
      "Tomato rice with eggs",
      "rice=110g;tomato=100g;eggs=2pcs",
      "Cook rice with tomato; top with boiled eggs.",
      30,
    ],
    [
      "Rice with omena and greens",
      "rice=110g;omena=90g;sukuma=100g",
      "Cook rice; simmer omena and sauté greens before serving.",
      35,
    ],
    [
      "Rice with cowpeas",
      "rice=110g;cowpeas=150g;onion=35g",
      "Cook rice; warm cooked cowpeas with onion.",
      30,
    ],
  ],
  Chicken: [
    [
      "Tomato chicken stew",
      "chicken=180g;tomato=100g;onion=50g",
      "Brown chicken pieces, add onion and tomato, and simmer until fully cooked.",
      40,
    ],
    [
      "Lemon grilled chicken",
      "chicken=180g;lemon=30g;oil=8ml",
      "Marinate chicken with lemon; grill until fully cooked.",
      40,
    ],
    [
      "Oven roasted chicken",
      "chicken=180g;potatoes=150g;oil=10ml",
      "Season chicken and potatoes; roast until chicken is fully cooked.",
      55,
    ],
    [
      "Chicken vegetable soup",
      "chicken=150g;carrots=70g;potatoes=100g;onion=40g",
      "Simmer chicken with vegetables until tender; serve hot.",
      45,
    ],
    [
      "Chicken and potatoes stew",
      "chicken=170g;potatoes=220g;tomato=70g",
      "Simmer chicken and potatoes in tomato broth until fully cooked.",
      45,
    ],
    [
      "Chicken with chapati",
      "chicken=160g;chapati=1pcs;onion=40g;tomato=60g",
      "Stew chicken with onion and tomato; serve with warmed chapati.",
      40,
    ],
    [
      "Chicken with sukuma wiki",
      "chicken=170g;sukuma=160g;onion=35g",
      "Pan-cook chicken fully; sauté greens with onion.",
      35,
    ],
    [
      "Chicken stir-fry with peppers",
      "chicken=160g;bell peppers=100g;onion=40g;oil=10ml",
      "Slice chicken thinly, stir-fry until cooked, then add peppers.",
      25,
    ],
    [
      "Chicken and cabbage skillet",
      "chicken=160g;cabbage=170g;carrots=60g",
      "Brown chicken until fully cooked; add cabbage and carrots.",
      32,
    ],
    [
      "Chicken with sweet potatoes",
      "chicken=160g;sweet potatoes=220g;tomato=60g",
      "Roast sweet potatoes and stew chicken with tomato.",
      45,
    ],
  ],
  Beef: [
    [
      "Slow beef stew",
      "beef=180g;tomato=100g;onion=50g;carrots=60g",
      "Brown beef, add vegetables and simmer slowly until tender.",
      70,
    ],
    [
      "Beef fry with onions",
      "beef=170g;onion=70g;tomato=50g;oil=10ml",
      "Cook beef until tender, then fry with onion and tomato.",
      45,
    ],
    [
      "Beef and potatoes stew",
      "beef=160g;potatoes=220g;tomato=80g",
      "Simmer beef until nearly tender; add potatoes and tomato.",
      55,
    ],
    [
      "Minced beef tomato skillet",
      "minced beef=170g;tomato=100g;onion=50g",
      "Brown minced beef thoroughly; simmer with tomato and onion.",
      25,
    ],
    [
      "Beef and vegetable soup",
      "beef=150g;carrots=80g;cabbage=80g;onion=40g",
      "Simmer beef until tender, then add vegetables.",
      65,
    ],
    [
      "Beef liver with onions",
      "liver=170g;onion=70g;oil=8ml",
      "Sear liver until cooked through; soften onions and combine.",
      25,
    ],
    [
      "Beef with cabbage",
      "beef=160g;cabbage=170g;tomato=60g",
      "Cook beef until tender and stir-fry with cabbage and tomato.",
      45,
    ],
    [
      "Beef with chapati",
      "beef=160g;chapati=1pcs;onion=50g",
      "Stew beef with onion until tender and serve with warm chapati.",
      50,
    ],
    [
      "Beef and green pepper stir-fry",
      "beef=160g;bell peppers=100g;onion=40g",
      "Slice beef thinly; stir-fry until cooked and add peppers.",
      30,
    ],
    [
      "Beef with pumpkin greens",
      "beef=150g;pumpkin leaves=160g;tomato=70g",
      "Stew beef until tender and sauté pumpkin greens separately.",
      50,
    ],
  ],
  Pork: [
    [
      "Tomato pork stew",
      "pork=180g;tomato=100g;onion=50g",
      "Brown pork and simmer with tomato and onion until cooked through.",
      45,
    ],
    [
      "Pork fry with onions",
      "pork=170g;onion=70g;oil=10ml",
      "Cook pork thoroughly, then fry with sliced onion.",
      40,
    ],
    [
      "Pork and rice bowl",
      "pork=160g;rice=110g;cabbage=80g",
      "Cook rice; pan-cook pork fully and serve with cabbage.",
      40,
    ],
    [
      "Pork and potatoes stew",
      "pork=160g;potatoes=220g;tomato=80g",
      "Simmer pork and potatoes in tomato sauce until cooked.",
      45,
    ],
    [
      "Pork with mixed vegetables",
      "pork=160g;carrots=80g;cabbage=80g;peas=50g",
      "Pan-cook pork fully; toss with cooked vegetables.",
      35,
    ],
    [
      "Grilled pork with sukuma",
      "pork=170g;sukuma=140g;lemon=20g",
      "Grill pork until cooked and serve with sautéed sukuma.",
      40,
    ],
    [
      "Pork with ugali and cabbage",
      "pork=160g;ugali=120g;cabbage=150g",
      "Cook ugali; fry pork until cooked and sauté cabbage.",
      45,
    ],
    [
      "Pork with sweet potatoes",
      "pork=160g;sweet potatoes=220g;onion=40g",
      "Roast sweet potatoes; cook pork and onion thoroughly.",
      45,
    ],
  ],
  Fish: [
    [
      "Pan-fried tilapia",
      "tilapia=190g;lemon=25g;oil=12ml",
      "Season and pan-fry tilapia until the flesh is fully cooked.",
      30,
    ],
    [
      "Tilapia tomato stew",
      "tilapia=180g;tomato=100g;onion=50g",
      "Simmer tilapia gently in tomato and onion sauce until cooked.",
      35,
    ],
    [
      "Lemon grilled fish",
      "white fish=190g;lemon=30g;oil=8ml",
      "Brush fish with lemon and oil; grill until cooked through.",
      30,
    ],
    [
      "Omena tomato stew",
      "omena=130g;tomato=100g;onion=50g",
      "Clean omena and simmer with onion and tomato.",
      30,
    ],
    [
      "Crispy fried omena",
      "omena=130g;onion=40g;oil=12ml",
      "Clean and drain omena; fry until cooked and lightly crisp.",
      25,
    ],
    [
      "Fish and vegetable soup",
      "white fish=160g;carrots=80g;potatoes=100g;onion=40g",
      "Simmer vegetables first, then add fish and cook gently.",
      35,
    ],
    [
      "Fish with rice and greens",
      "white fish=170g;rice=110g;sukuma=100g",
      "Cook rice; pan-cook fish and sauté greens.",
      38,
    ],
    [
      "Fish with potatoes and peas",
      "white fish=170g;potatoes=200g;peas=80g",
      "Boil potatoes and peas; cook fish separately until done.",
      35,
    ],
    [
      "Fish with cabbage and carrots",
      "white fish=170g;cabbage=150g;carrots=70g",
      "Pan-cook fish and stir-fry cabbage with carrots.",
      30,
    ],
    [
      "Tilapia with coconut sauce",
      "tilapia=180g;coconut milk=120ml;tomato=70g",
      "Simmer tilapia in tomato and coconut sauce until cooked.",
      38,
    ],
  ],
  Legumes: [
    [
      "Classic githeri",
      "githeri=300g;onion=40g;tomato=70g",
      "Warm cooked maize and beans with onion and tomato.",
      25,
    ],
    [
      "Githeri with avocado and tomato",
      "githeri=260g;avocado=1pcs;tomato=70g",
      "Warm githeri and top with diced avocado and tomato.",
      20,
    ],
    [
      "Vegetable githeri",
      "githeri=260g;carrots=70g;sukuma=80g;onion=30g",
      "Sauté vegetables and fold through warmed githeri.",
      25,
    ],
    [
      "Spiced beans stew",
      "beans=200g;tomato=100g;onion=50g;oil=8ml",
      "Simmer cooked beans with softened onion and tomato.",
      25,
    ],
    [
      "Creamy ndengu stew",
      "ndengu=200g;tomato=90g;onion=40g",
      "Simmer cooked green grams until creamy with tomato and onion.",
      25,
    ],
    [
      "Red lentil stew",
      "lentils=180g;tomato=90g;onion=40g",
      "Rinse lentils and simmer with tomato and onion until soft.",
      30,
    ],
    [
      "Cowpeas with tomato",
      "cowpeas=190g;tomato=90g;onion=40g",
      "Simmer cooked cowpeas with onion and tomato.",
      25,
    ],
    [
      "Beans and chapati plate",
      "beans=180g;chapati=1pcs;tomato=70g",
      "Warm bean stew and serve with a soft chapati.",
      20,
    ],
    [
      "Beans and rice plate",
      "beans=180g;rice=110g;onion=35g",
      "Cook rice and warm cooked beans with onion.",
      30,
    ],
    [
      "Peas and potatoes curry",
      "peas=150g;potatoes=190g;tomato=90g",
      "Simmer peas and potatoes in tomato sauce until tender.",
      30,
    ],
    [
      "Bean and vegetable soup",
      "beans=160g;carrots=80g;cabbage=80g;onion=40g",
      "Simmer cooked beans with chopped vegetables in broth.",
      30,
    ],
    [
      "Ndengu with chapati",
      "ndengu=180g;chapati=1pcs;tomato=70g",
      "Simmer cooked ndengu with tomato; serve with chapati.",
      25,
    ],
    [
      "Lentils with coconut milk",
      "lentils=170g;coconut milk=150ml;onion=40g",
      "Simmer lentils with onion and coconut milk until soft.",
      30,
    ],
    [
      "Githeri with sweet potatoes",
      "githeri=220g;sweet potatoes=180g;tomato=60g",
      "Boil sweet potatoes and fold through warm githeri.",
      30,
    ],
    [
      "Cowpeas and sukuma",
      "cowpeas=170g;sukuma=140g;onion=40g",
      "Warm cooked cowpeas and sauté sukuma with onion.",
      25,
    ],
    [
      "Chickpea tomato stew",
      "chickpeas=180g;tomato=100g;onion=40g",
      "Simmer cooked chickpeas with onion and tomato.",
      25,
    ],
    [
      "Black-eyed peas with rice",
      "cowpeas=170g;rice=110g;tomato=60g",
      "Cook rice and warm peas in a light tomato sauce.",
      30,
    ],
  ],
  "Potatoes & pasta": [
    [
      "Boiled potatoes with greens",
      "potatoes=250g;sukuma=130g",
      "Boil potatoes until tender; sauté greens.",
      25,
    ],
    [
      "Mashed potatoes with milk",
      "potatoes=260g;milk=80ml",
      "Boil potatoes, drain and mash with warm milk.",
      30,
    ],
    [
      "Roast potatoes with carrots",
      "potatoes=260g;carrots=100g;oil=10ml",
      "Roast potato wedges and carrots until golden and tender.",
      45,
    ],
    [
      "Tomato potato stew",
      "potatoes=260g;tomato=100g;onion=45g",
      "Simmer cubed potatoes with onion and tomato until soft.",
      30,
    ],
    [
      "Boiled sweet potatoes",
      "sweet potatoes=280g",
      "Boil sweet potatoes until fork-tender.",
      25,
    ],
    [
      "Boiled arrowroots",
      "arrowroots=280g",
      "Boil peeled arrowroots in lightly salted water until tender.",
      35,
    ],
    [
      "Homemade chapati",
      "wheat flour=130g;oil=12ml",
      "Knead flour with water and oil; roll and cook both sides on a hot pan.",
      35,
    ],
    [
      "Spaghetti with tomato sauce",
      "spaghetti=120g;tomato=130g;onion=45g",
      "Boil spaghetti; simmer tomato with onion and toss together.",
      25,
    ],
    [
      "Pasta with minced beef",
      "pasta=120g;minced beef=140g;tomato=100g",
      "Boil pasta; brown minced beef and simmer with tomato.",
      30,
    ],
    [
      "Pasta with vegetables",
      "pasta=120g;carrots=70g;peas=70g;tomato=80g",
      "Boil pasta and toss with sautéed vegetables.",
      25,
    ],
    [
      "Creamy milk pasta",
      "pasta=120g;milk=150ml;peas=60g",
      "Boil pasta; simmer briefly with milk and peas.",
      25,
    ],
    [
      "Potato and egg hash",
      "potatoes=220g;eggs=2pcs;onion=40g",
      "Pan-cook diced potatoes, add onion, then fold in eggs.",
      30,
    ],
    [
      "Sweet potato and bean bowl",
      "sweet potatoes=220g;beans=150g;tomato=60g",
      "Roast sweet potatoes and top with warmed beans.",
      35,
    ],
  ],
  Snacks: [
    ["Ripe banana", "bananas=1pcs", "Peel and serve fresh.", 1],
    [
      "Avocado slices",
      "avocado=1pcs;lemon=10g",
      "Slice avocado and squeeze over lemon.",
      3,
    ],
    ["Fresh orange", "oranges=1pcs", "Peel and divide into segments.", 2],
    ["Pawpaw bowl", "pawpaw=200g", "Peel, remove seeds and cube pawpaw.", 4],
    ["Mango slices", "mango=200g", "Peel and slice a ripe mango.", 4],
    [
      "Watermelon wedges",
      "watermelon=250g",
      "Slice chilled watermelon into wedges.",
      3,
    ],
    ["Pineapple chunks", "pineapple=220g", "Peel and cube fresh pineapple.", 5],
    [
      "Roasted groundnuts",
      "groundnuts=45g",
      "Dry-roast groundnuts until fragrant and cool before serving.",
      10,
    ],
    [
      "Peanut butter sandwich",
      "bread=2slices;peanut butter=30g",
      "Spread peanut butter on bread and sandwich together.",
      4,
    ],
    [
      "Plain yoghurt with fruit",
      "yoghurt=180g;bananas=1pcs",
      "Slice banana over chilled yoghurt.",
      3,
    ],
    ["Glass of milk", "milk=250ml", "Serve milk chilled or gently warmed.", 1],
    [
      "Two boiled eggs",
      "eggs=2pcs",
      "Boil eggs until firm, cool and peel.",
      12,
    ],
    [
      "Roasted maize cob",
      "maize=1cobs",
      "Roast maize over moderate heat until cooked and lightly charred.",
      25,
    ],
    [
      "Sweet potato snack bowl",
      "sweet potatoes=180g",
      "Boil sweet potato and cut into bite-size pieces.",
      20,
    ],
    [
      "Mixed fruit salad",
      "bananas=1pcs;mango=100g;pawpaw=100g",
      "Cube fruit and toss together just before serving.",
      7,
    ],
    [
      "Banana milk smoothie",
      "bananas=1pcs;milk=250ml",
      "Blend banana and milk until smooth; serve immediately.",
      5,
    ],
    [
      "Avocado milk smoothie",
      "avocado=1pcs;milk=220ml",
      "Blend ripe avocado with milk until smooth.",
      5,
    ],
    [
      "Groundnuts with banana",
      "groundnuts=35g;bananas=1pcs",
      "Serve a small handful of groundnuts with a banana.",
      2,
    ],
    [
      "Yoghurt with mango",
      "yoghurt=180g;mango=120g",
      "Cube mango and fold into yoghurt.",
      4,
    ],
    [
      "Chapati snack roll",
      "chapati=1pcs;avocado=1pcs;tomato=50g",
      "Warm chapati, add sliced avocado and tomato, then roll.",
      6,
    ],
  ],
  "Vegetables & soups": [
    [
      "Sukuma wiki with onions",
      "sukuma=220g;onion=45g;oil=8ml",
      "Wash greens; sauté with softened onion until tender.",
      18,
    ],
    [
      "Cabbage and carrot stir-fry",
      "cabbage=200g;carrots=90g;oil=8ml",
      "Slice cabbage thinly and stir-fry with carrots.",
      18,
    ],
    [
      "Kienyeji greens with tomato",
      "kienyeji greens=220g;tomato=80g;onion=40g",
      "Wash local greens well, simmer until tender and finish with tomato.",
      28,
    ],
    [
      "Pumpkin leaves in coconut milk",
      "pumpkin leaves=220g;coconut milk=120ml;onion=35g",
      "Wash leaves thoroughly and simmer gently with coconut milk.",
      30,
    ],
    [
      "Carrot and potato soup",
      "carrots=180g;potatoes=170g;onion=40g",
      "Simmer vegetables until soft and mash lightly.",
      30,
    ],
    [
      "Tomato and bean soup",
      "tomato=180g;beans=150g;onion=40g",
      "Simmer cooked beans in a fresh tomato broth.",
      25,
    ],
    [
      "Lentil and vegetable soup",
      "lentils=150g;carrots=80g;tomato=80g",
      "Simmer lentils and vegetables until soft.",
      32,
    ],
    [
      "Cabbage with peas",
      "cabbage=180g;peas=100g;onion=35g",
      "Sauté cabbage and onion; add peas until heated through.",
      22,
    ],
    [
      "Vegetable omelette plate",
      "eggs=2pcs;carrots=50g;tomato=60g;onion=30g",
      "Cook chopped vegetables, pour over eggs and fold.",
      18,
    ],
    [
      "Pumpkin and bean stew",
      "pumpkin=180g;beans=150g;tomato=80g",
      "Simmer pumpkin cubes with cooked beans and tomato.",
      30,
    ],
  ],
};
const knownCategories: Record<string, string> = {
  eggs: "Dairy & eggs",
  milk: "Dairy & eggs",
  yoghurt: "Dairy & eggs",
  bread: "Grains",
  chapati: "Grains",
  ugali: "Grains",
  rice: "Grains",
  "wheat flour": "Grains",
  "maize flour": "Grains",
  "millet flour": "Grains",
  oats: "Grains",
  spaghetti: "Grains",
  pasta: "Grains",
  maize: "Grains",
  githeri: "Legumes",
  beans: "Legumes",
  ndengu: "Legumes",
  lentils: "Legumes",
  cowpeas: "Legumes",
  chickpeas: "Legumes",
  peas: "Legumes",
  beef: "Meat",
  "minced beef": "Meat",
  liver: "Meat",
  chicken: "Meat",
  pork: "Meat",
  tilapia: "Fish",
  omena: "Fish",
  "white fish": "Fish",
  bananas: "Fruits",
  oranges: "Fruits",
  pawpaw: "Fruits",
  mango: "Fruits",
  watermelon: "Fruits",
  pineapple: "Fruits",
  avocado: "Fruits",
  groundnuts: "Pantry essentials",
  "peanut butter": "Pantry essentials",
  tea: "Pantry essentials",
  oil: "Pantry essentials",
  "pilau masala": "Pantry essentials",
  "coconut milk": "Pantry essentials",
};
const animal = new Set([
  "beef",
  "minced beef",
  "liver",
  "chicken",
  "pork",
  "tilapia",
  "omena",
  "white fish",
]);
const fish = new Set(["tilapia", "omena", "white fish"]);
const dairy = new Set(["milk", "yoghurt"]);
const wheat = new Set([
  "bread",
  "chapati",
  "wheat flour",
  "mandazi",
  "spaghetti",
  "pasta",
]);
const nuts = new Set(["groundnuts", "peanut butter"]);
const spec = (raw: string): Ingredient[] =>
  raw
    .split(";")
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+)=(\d+(?:\.\d+)?)([a-z]+)$/);
      if (!match) throw new Error(`Invalid ingredient ${part}`);
      const name = match[1];
      return {
        name,
        qty: Number(match[2]),
        unit: match[3],
        category: knownCategories[name] || "Vegetables",
      };
    });
const icon = (group: Group) =>
  (
    ({
      Breakfast: "🍳",
      Ugali: "🥘",
      Rice: "🍚",
      Chicken: "🍗",
      Beef: "🥩",
      Pork: "🥘",
      Fish: "🐟",
      Legumes: "🫘",
      "Potatoes & pasta": "🥔",
      Snacks: "🍎",
      "Vegetables & soups": "🥬",
    }) as Record<Group, string>
  )[group];
const slots = (group: Group): Slot[] =>
  group === "Breakfast"
    ? ["breakfast"]
    : group === "Snacks"
      ? ["snack"]
      : ["lunch", "dinner"];
const substitutions = (ingredients: Ingredient[]) =>
  ingredients.some((i) => animal.has(i.name))
    ? ["beans", "ndengu", "eggs", "omena"].filter(
        (x) => !ingredients.some((i) => i.name === x),
      )
    : [];
const photo = (name: string) =>
  name === "Boiled eggs, bread & milk"
    ? "/food/eggs-bread-milk.webp"
    : name === "Ugali with beef stew"
      ? "/food/ugali-beef-sukuma.webp"
      : name === "Rice with beans stew"
        ? "/food/rice-beans-sukuma.webp"
        : name === "Githeri with avocado and tomato"
          ? "/food/githeri-avocado.webp"
          : undefined;
export const curatedRecipes: Recipe[] = Object.entries(groupRows).flatMap(
  ([group, rows]) =>
    (rows as Row[]).map(([name, raw, steps, minutes]) => {
      const ingredients = spec(raw);
      const names = ingredients.map((i) => i.name);
      const allergens = [
        names.includes("eggs") ? "eggs" : null,
        names.some((x) => dairy.has(x)) ? "milk" : null,
        names.some((x) => wheat.has(x)) ? "wheat" : null,
        names.some((x) => nuts.has(x)) ? "peanuts" : null,
        names.some((x) => fish.has(x)) ? "fish" : null,
      ].filter((x): x is string => !!x);
      const dietaryTags = names.some((x) => animal.has(x))
        ? []
        : names.some((x) => dairy.has(x) || x === "eggs")
          ? ["vegetarian"]
          : ["vegetarian", "vegan"];
      return {
        id: `curated-${name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`,
        name,
        category: group,
        description: `${name} prepared with ${names.slice(0, 3).join(", ")}.`,
        mealTypes: slots(group as Group),
        ingredients,
        steps,
        minutes,
        servings: 1,
        emoji: icon(group as Group),
        favorite: false,
        dietaryTags,
        allergens,
        substitutions: substitutions(ingredients),
        image: photo(name),
        source: "builtin" as const,
      };
    }),
);
const template = (
  id: string,
  name: string,
  description: string,
  days: [string, string, string, string][],
): PlanTemplate => ({
  id,
  name,
  description,
  createdAt: "2026-11-04",
  items: days.flatMap((day, n) =>
    day.map((recipeId, index) => ({
      day: n,
      slot: (["breakfast", "lunch", "snack", "dinner"] as Slot[])[index],
      recipeId,
      portion: 1,
    })),
  ),
});
export const builtInTemplates: PlanTemplate[] = [
  template(
    "template-gain",
    "Affordable Kenyan weight-gain plan",
    "Regular meals with familiar Kenyan staples and varied proteins",
    [
      [
        "curated-boiled-eggs-bread-milk",
        "ugali-beef",
        "curated-ripe-banana",
        "rice-beans",
      ],
      [
        "curated-sweet-potatoes-with-warm-milk",
        "githeri-sukuma",
        "curated-roasted-groundnuts",
        "ugali-omena",
      ],
      [
        "curated-arrowroots-with-milk-tea",
        "rice-chicken",
        "curated-avocado-slices",
        "ugali-ndengu",
      ],
      [
        "curated-chapati-with-fried-eggs",
        "rice-beans-sukuma",
        "curated-yoghurt-with-mango",
        "githeri-avocado",
      ],
      [
        "curated-oats-with-banana",
        "ugali-pork",
        "curated-sweet-potato-snack-bowl",
        "rice-ndengu",
      ],
      [
        "curated-eggs-bread-avocado",
        "ugali-tilapia",
        "curated-groundnuts-with-banana",
        "curated-vegetable-fried-rice",
      ],
      [
        "curated-millet-porridge-with-banana",
        "curated-githeri-with-avocado-and-tomato",
        "curated-mixed-fruit-salad",
        "curated-rice-with-beans-stew",
      ],
    ],
  ),
  template(
    "template-balanced",
    "Balanced everyday Kenyan plan",
    "Vegetables, legumes and varied main dishes across the week",
    [
      [
        "curated-vegetable-egg-wrap",
        "curated-rice-with-ndengu-stew",
        "curated-fresh-orange",
        "curated-ugali-with-sukuma-wiki",
      ],
      [
        "curated-fruit-and-yoghurt-bowl",
        "curated-chicken-with-sukuma-wiki",
        "curated-roasted-groundnuts",
        "curated-beans-and-rice-plate",
      ],
      [
        "curated-arrowroots-with-milk-tea",
        "curated-ugali-with-omena",
        "curated-ripe-banana",
        "curated-vegetable-githeri",
      ],
      [
        "curated-scrambled-eggs-with-tomato",
        "curated-rice-with-tilapia",
        "curated-mango-slices",
        "curated-lentils-with-coconut-milk",
      ],
      [
        "curated-millet-porridge-with-banana",
        "curated-ugali-with-beans-stew",
        "curated-avocado-slices",
        "curated-chicken-and-cabbage-skillet",
      ],
      [
        "curated-sweet-potatoes-with-boiled-eggs",
        "curated-beef-with-cabbage",
        "curated-pawpaw-bowl",
        "curated-rice-with-mixed-vegetables",
      ],
      [
        "curated-oats-with-banana",
        "curated-githeri-with-avocado-and-tomato",
        "curated-yoghurt-with-mango",
        "curated-fish-with-potatoes-and-peas",
      ],
    ],
  ),
  template(
    "template-variety",
    "High-protein food-variety plan",
    "Eggs, legumes, fish and meat across diverse home-cooked dishes",
    [
      [
        "curated-boiled-eggs-bread-milk",
        "curated-ugali-with-beef-liver",
        "curated-plain-yoghurt-with-fruit",
        "curated-ndengu-with-chapati",
      ],
      [
        "curated-vegetable-egg-wrap",
        "curated-lemon-grilled-chicken",
        "curated-roasted-groundnuts",
        "curated-rice-with-beans-stew",
      ],
      [
        "curated-beans-with-chapati-breakfast",
        "curated-tilapia-tomato-stew",
        "curated-ripe-banana",
        "curated-ugali-with-fried-eggs",
      ],
      [
        "curated-avocado-egg-toast",
        "curated-pork-and-potatoes-stew",
        "curated-glass-of-milk",
        "curated-githeri-with-sweet-potatoes",
      ],
      [
        "curated-porridge-with-groundnuts",
        "curated-beef-and-green-pepper-stir-fry",
        "curated-two-boiled-eggs",
        "curated-rice-with-omena-and-greens",
      ],
      [
        "curated-sweet-potatoes-with-boiled-eggs",
        "curated-chicken-vegetable-soup",
        "curated-yoghurt-with-mango",
        "curated-ugali-with-cowpeas",
      ],
      [
        "curated-sukuma-omelette",
        "curated-fish-with-rice-and-greens",
        "curated-groundnuts-with-banana",
        "curated-lentils-with-coconut-milk",
      ],
    ],
  ),
  template(
    "template-staples",
    "Low-budget staples plan",
    "Staple grains, beans, ndengu and seasonal vegetables",
    [
      [
        "curated-millet-porridge-with-banana",
        "curated-ugali-with-beans-stew",
        "curated-ripe-banana",
        "curated-tomato-potato-stew",
      ],
      [
        "curated-boiled-sweet-potatoes",
        "curated-vegetable-githeri",
        "curated-roasted-groundnuts",
        "curated-rice-with-ndengu-stew",
      ],
      [
        "curated-arrowroots-with-milk-tea",
        "curated-ugali-with-omena",
        "curated-fresh-orange",
        "curated-beans-and-rice-plate",
      ],
      [
        "curated-porridge-with-groundnuts",
        "curated-cowpeas-and-sukuma",
        "curated-sweet-potato-snack-bowl",
        "curated-ugali-with-cabbage",
      ],
      [
        "curated-beans-with-chapati-breakfast",
        "curated-rice-with-green-peas",
        "curated-ripe-banana",
        "curated-ndengu-with-chapati",
      ],
      [
        "curated-oats-with-banana",
        "curated-ugali-with-fried-eggs",
        "curated-roasted-groundnuts",
        "curated-vegetable-githeri",
      ],
      [
        "curated-boiled-eggs-bread-milk",
        "curated-githeri-with-sweet-potatoes",
        "curated-pawpaw-bowl",
        "curated-rice-with-beans-stew",
      ],
    ],
  ),
];
