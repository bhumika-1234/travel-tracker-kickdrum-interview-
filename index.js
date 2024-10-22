import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcryptjs/dist/bcrypt.js";

const app = express();
const port = 3000;
const saltrounds=10;
var curruser=0;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Travel Tracker",
  password: "abcd1234",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function checkVisisted(user_id) {
  const result = await db.query("Select countries.country_code from visited_countries JOIN users ON users.id=visited_countries.user_id join countries on countries.id=visited_countries.country_id where users.id="+user_id);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/home",(req,res)=>{
  res.redirect("/");
})

app.get("/", (req, res)=>{
  res.render("home.ejs");
})

app.get("/register", async(req,res)=>{
  res.render("login.ejs",{
    register:"true",
    text:"register"
  })
})

app.get("/login", async(req,res)=>{
    res.render("login.ejs",{
      text:"login",
    })
})

app.post("/register", async (req, res) => {
    const email=await db.query("select email from users where email='"+req.body.email+"'");
    console.log(email.rows[0]);
    if(email.rows.length==1){
        res.render("login.ejs", {
          err: "You are already registered",
          text: "register"
      });
    }else{
      const email = req.body.email; 
      const name = req.body.name; 
      const password = req.body.password;
  
      try {

          bcrypt.hash(password, saltrounds, async(err,hash)=>{
            if(err){
              console.log(err);
            }else{
            const queryText = `
            INSERT INTO users(email, "name", "password")
            VALUES ('${email}', '${name}', '${hash}')
            `;

            await db.query(queryText); // Execute the query

            res.render("login.ejs",{
              err:"Registered sucessfully! Login through home page",
              text:"register"
            })}

          })
         
      } catch (err) {
          console.error("Error inserting user:", err);
          res.render("login.ejs", {
              err: "An error occurred while registering.",
              text: "register"
          });
      }
    //   const countries = await checkVisisted(curruser);
    //   var search=0;
    //   for(var i=0;i<users.length;i++){
    //     if(users[i].id===curruser) search=i;
    //   }
    //   var col=users[search].color;
    //   res.render("index.ejs", {
    //     countries: countries,
    //     total: countries.length,
    //     users: users,
    //     color: col,
    //   });
    }
  });

app.post("/login", async (req, res) => {
  console.log(req.body)
  const id=await db.query("select * from users where email='"+req.body.email+"'");
  console.log(id.rows.length);
  if(id.rows.length==0){
    res.render("login.ejs", {
      err: "You not a registered user",
      text: "login"
    });
  }else{
      const regPassword=id.rows[0].password;
      const passwordGiven=req.body.password;
      bcrypt.compare(passwordGiven,regPassword,async(err,result)=>{
        console.log(result);
        if(!result){
          res.render("login.ejs", {
            err: "Wrong password",
            text: "login"
          });
        }else{
          curruser=id.rows[0].id;
          console.log("current user is: "+curruser);
          const countries = await checkVisisted(curruser);
          console.log("countries visited are: "+countries);
          res.render("index.ejs", {
            countries: countries,
            total: countries.length,
            color: "teal",
          });
        }
      })
     
}
});



app.post("/add", async (req, res) => {
  const ins = req.body["country"];
  const input = ins
    .split(" ") 
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) 
    .join(" "); 
  
  try {
    const result = await db.query(
      "Select * from countries where countries.country_name='"+input+"'"
    );
    
    console.log("here the curr user is: "+curruser);
    const data = result.rows[0];
    // console.log("data of adding is: "+data)
    if(data) {
      // console.log("entered in the non existent part");
      // const countries = await checkVisisted("the visited countries are:"+curruser);
      // res.render("index.ejs", {
      //   countries: countries,
      //   total: countries.length,
      //   color: "teal",
      //   error:"Not a valid country, Type a valid country's name"
      // });

      const countryCode = data.id;
        try {
          await db.query(
            "INSERT INTO visited_countries VALUES("+curruser+","+countryCode+")"
          );
            const countries = await checkVisisted(curruser);
            console.log(countries)
            res.render("index.ejs", {
              countries: countries,
              total: countries.length,
              color: "teal",
            });
        } catch (err) {
          console.log(err);
        }
    
    }else {
      console.log("entered in the non existent part");
      const countries = await checkVisisted(curruser);
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        color: "teal",
        error:"Not a valid country, Type a valid country's name"
      });
    }
  } catch (err) {
    console.log(err);
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Select country_code
// from visited_countries
// join users On users.id=visited_countries.user_id
// join countries on countries.id=visited_countries.country_id
// where users.id=2